const { server } = require("../apps/express")
const { Server } = require('socket.io');
const corsOptions = require("../creds/corsOptions");
const { auth } = require("../apps/firebase")
const { v4: uuidv4 } = require('uuid');
const client = require("./mongo_db");
const { create_game } = require("../games/memoryGame");

const io = new Server(server, {
    cors: {
        origin: corsOptions.origin,
        methods: ["GET", "POST"]
    }
});

io.on('connection', async (socket) => {
    console.log("connection recieved")
    console.log(socket.handshake.auth)
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
            console.log(user)
            if (!user) {
                await client.db("memory")
                    .collection("users")
                    .insertOne({
                        "uid": socket.uid,
                        "rooms": [],
                    })
                console.log("inserted user" + socket.uid)
            } else {
                console.log("user present " + socket.uid)
            }
        })
        .catch((error) => {
            console.log(error)
            socket.disconnect()
        })

    const join_room = async (room_id, uid) => {
        await usersCollection.findOneAndUpdate(
            { uid: uid },
            { $addToSet: { rooms: room_id } }
        ).then(() => {
            console.log("created room " + room_id)
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
            console.log("created room " + room_id)
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
        console.log("joining room", socket.uid, socket.displayName, room_id)
        socket.join(room_id)
        await join_room(room_id, socket.uid)
        if(callback instanceof Function){
            callback()
        }
    });
    socket.on("create_room", async (callback) => {
        let room_id = uuidv4()
        await client.connect()
        await join_room(room_id, socket.uid)
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
        console.log(rooms)
        if (rooms) {
            console.log("rooms")
            console.log(rooms["rooms"])
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
        await client.db("memory").collection("game").deleteMany({})
        create_game(room_id)    
    });
});
module.exports = io