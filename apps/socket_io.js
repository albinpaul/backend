const { server } = require("../apps/express")
const { Server } = require('socket.io');
const { auth } = require("../apps/firebase")
const { v4: uuidv4 } = require('uuid');
const client = require("./mongo_db");
const { create_game, getGameState, pickCard, enableTurn } = require("../games/memoryGame");
const e = require("express");
const { ObjectId } = require("mongodb");

const io = new Server(server, {
    cors: {
        origin: process.env.COORD_ORIGIN,
        methods: ["GET", "POST"]
    }
});

io.on('connection', async (socket) => {
    let token = socket.handshake.auth.access_token;
    if (token === undefined) {
        socket.disconnect()
        return;
    }

    let usersCollection = client
        .db("memory")
        .collection("users")
    let roomCollection = client
        .db("memory")
        .collection("rooms")
    await auth.verifyIdToken(token)
        .then(async (decodedToken) => {
            socket.uid = decodedToken.uid
            console.log("display_name is " + socket.handshake.auth.display_name)
            socket.displayName = socket.handshake.auth.display_name
            await client.connect();
            let usersCollection = client.db("memory").collection("users")
            let user = await usersCollection.findOne({ "uid": socket.uid })
            if (!user) {
                await client.db("memory")
                    .collection("users")
                    .insertOne({
                        "uid": socket.uid,
                        "rooms": [],
                    })
            } 
        })
        .catch((error) => {
            socket.disconnect()
        })

    const join_room = async (room_id, uid) => {
        await usersCollection.findOneAndUpdate(
            { uid: uid },
            { $addToSet: { rooms: room_id } }
        ).then(() => {
            console.log("joined users collection " + room_id)
        }).catch(console.error)
        await roomCollection.findOneAndUpdate(
            {
                room_id: room_id,
            },
            {
                $addToSet: {
                    users: uid,
                }
            }
        )
        .then(() => {
            console.log("joined room " + uid)
        }).catch(console.error)
    }
    const updateSockets = async (room_id) => {
        let sockets = await io.in(room_id).fetchSockets()
        let names = []
        for (let tsocket of sockets) {
            names.push(tsocket.displayName)
        }
        io.to(room_id).emit("send_client_names", names)
    }
    socket.on("join_room", async (room_id, callback) => {
        socket.join(room_id)
        await join_room(room_id, socket.uid)
        if(callback instanceof Function){
            callback()
        }
    });
    socket.on("create_room", async (callback) => {
        let room_id = uuidv4()
        await client.connect()
        await roomCollection.insertOne(
            {
                room_id: room_id,
                users: [socket.uid],
                games: []
            },
        )
        await join_room(room_id, socket.uid)
        .then(() => {
            console.log("created room " + room_id)
        }).catch(console.error) 
        socket.join(room_id)
        console.log("created_room", callback)
        callback(room_id)
    })

    socket.on("send_message", (message, room) => {
        if (room === '') {
            socket.emit("recieve_message", message)
        } else {
            socket.to(room).emit("recieve_message", message)
        }
    })

    socket.on("get_rooms", async () => {
        console.log("got request for rooms")
        await client.connect()
        let rooms = await client.db("memory")
            .collection("users")
            .findOne({ uid: socket.uid })
        if (rooms) {
            socket.emit("recieve_rooms", rooms["rooms"])
        } else {
            console.log("no rooms")
            socket.emit("recieve_rooms", rooms)
        }
    });
    socket.on("get_connected_sockets", async (room_id)=>{
        await updateSockets(room_id)
    })

    socket.on("create_game", async (room_id) => {
        console.log("creating game")
        let {game_id, users} = await create_game(room_id, io)
        await io.to(room_id).emit("game_created", game_id.toString())
    });
    socket.on("join_game_room", async (game_id, callback) => {
        console.log("got join request on ", game_id)
        let gameResult = await client.db("memory")
            .collection("game")
            .findOne({_id: new ObjectId(game_id)})
        if(gameResult){
            console.log("game is", gameResult)
            socket.join(gameResult.room_id)
            let game = await client.db("memory")
            .collection("game")
            .findOneAndUpdate(
                {_id: new ObjectId(game_id)},
                {$addToSet: {
                    users: socket.uid
                }}
            )
        }
        if(callback instanceof Function){
            callback()
        }
    });
    socket.on("get_turn", async (game_id) => {
        let game = await client.db("memory")
        .collection("game")
        .findOne({_id: new ObjectId(game_id)})
        socket.emit("update_points", game.points[socket.uid])
        if(game){
            await enableTurn(game.turn, game.room_id, game.users, io)
        }
    })
    socket.on("get_current_state", async(game_id) => {
        const state = await getGameState(game_id)
        // socket.emit("set_turn", true)
        socket.emit("emitted_current_state", state)
    })
    socket.on("get_all_game_in_room", async (room_id) => {
        let room = await roomCollection.findOne({room_id, room_id})
        if(room){
            socket.emit("all_games_in_room", room.games)
        }
    })
    socket.on("pick_card", async (game_id, cardArray, card_id) => {
        console.log("got card ", game_id, card_id)
        await pickCard(card_id, cardArray, game_id, socket, io)
        let game = await client.db("memory")
        .collection("game")
        .findOne({_id: new ObjectId(game_id)})
        await enableTurn(game.turn, game.room_id, game.users, io)
    })
});
module.exports = io