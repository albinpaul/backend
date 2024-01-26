const { server } = require("../apps/express")
const { Server } = require('socket.io');
const corsOptions = require("../creds/corsOptions");
const { auth } = require("../apps/firebase")
const { v4: uuidv4 } = require('uuid');
const client = require("./mongo_db");
const { create_game, pickFirstCard, getGameState, pickCard } = require("../games/memoryGame");
const e = require("express");
const { ObjectId } = require("mongodb");

const io = new Server(server, {
    cors: {
        origin: corsOptions.origin,
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
            console.log("joined room " + room_id)
        }).catch(console.error)

        await roomCollection.updateOne(
            {
                room_id: room_id,
                users: [uid],
                games: []
            },
            {
                $addToSet: {
                    users: uid,
                }
            }
        )
        .then(() => {
            console.log("joined room " + room_id)
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

    const enableTurn = async (turn_id, room_id, users) => {
        let sockets = await io.in(room_id).fetchSockets()
        for(let tsocket of sockets) {
            console.log("checking turn for " + tsocket.uid)
            if(tsocket.uid == users[turn_id]){
                console.log("enabling turn for " + tsocket.uid)
                console.log(tsocket.id)
                
                
                tsocket.emitWithAck("set_turn", 1, (error, response) => {
                    console.log("response of turn");
                    if (error) {
                        console.log("error");
                        console.log(error);
                    } else {
                        console.log("response");
                        console.log(response);
                    }
                })
            } else {
                tsocket.emit("set_turn", 0)
            }
        }

    }
    socket.on("create_game", async (room_id) => {
        console.log("creating game")
        let {game_id, users} = await create_game(room_id, io)
        await io.to(room_id).emit("game_created", game_id.toString())
    });
    socket.on("join_game_room", async (game_id, callback) => {
        let game = await client.db("memory")
        .collection("game")
        .findOne({_id: new ObjectId(game_id)})
        if(game){
            socket.join(game.room_id)
        }
        if(callback instanceof Function){
            callback()
        }
    });
    socket.on("get_turn", async (game_id) => {
        let game = await client.db("memory")
        .collection("game")
        .findOne({_id: new ObjectId(game_id)})
        console.log("getting_cturn " , game)
        if(game){
            await enableTurn(game.turn, game.room_id, game.users)
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
    socket.on("pick_card", async (game_id, card_id) => {
        console.log("got card ", game_id, card_id)
        await pickCard(card_id, game_id, socket, io)
    })
});
module.exports = io