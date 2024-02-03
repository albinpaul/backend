const client = require("../apps/mongo_db");
const io = require("../apps/socket_io");
const {ObjectId} = require('mongodb');

const CARDS = [
    ["ace", "clubs"],
    ["ace", "diamonds"],
    ["ace", "hearts"],
    ["ace", "spades"],
    ["eight", "clubs"],
    ["eight", "diamonds"],
    ["eight", "hearts"],
    ["eight", "spades"],
    ["five", "clubs"],
    ["five", "diamonds"],
    ["five", "hearts"],
    ["five", "spades"],
    ["four", "clubs"],
    ["four", "diamonds"],
    ["four", "hearts"],
    ["four", "spades"],
    ["jack", "clubs"],
    ["jack", "diamonds"],
    ["jack", "hearts"],
    ["jack", "spades"],
    ["king", "clubs"],
    ["king", "diamonds"],
    ["king", "hearts"],
    ["king", "spades"],
    ["nine", "clubs"],
    ["nine", "diamonds"],
    ["nine", "hearts"],
    ["nine", "spades"],
    ["queen", "clubs"],
    ["queen", "diamonds"],
    ["queen", "hearts"],
    ["queen", "spades"],
    ["seven", "clubs"],
    ["seven", "diamonds"],
    ["seven", "hearts"],
    ["seven", "spades"],
    ["six", "clubs"],
    ["six", "diamonds"],
    ["six", "hearts"],
    ["six", "spades"],
    ["ten", "clubs"],
    ["ten", "diamonds"],
    ["ten", "hearts"],
    ["ten", "spades"],
    ["three", "clubs"],
    ["three", "diamonds"],
    ["three", "hearts"],
    ["three", "spades"],
    ["two", "clubs"],
    ["two", "diamonds"],
    ["two", "hearts"],
    ["two", "spades"],
]

const shuffle = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};


const processState = (state) => {
    let currentState = []
    if(state){
        let gameState = state.state
        let pickedStates = state.pickedCards
        for(let s = 0; s < gameState.length; s++){
            if(pickedStates[s])
            {
                currentState.push(gameState[s])
            } else {
                currentState.push([])
            }
        }
    }
    return currentState
}

const getGameState = async (game_id) => { 
    console.log("gameid is " + game_id)
    let state = await client.db("memory")
        .collection("game")
        .findOne(
        {
            _id: new ObjectId(game_id)
        })
    return processState(state)
}

const create_game = async (room_id, io) => {
    let gameState = []
    let pickedCards = []
    for (let i = 0; i < CARDS.length; i++) {
        gameState.push(CARDS[i])
        pickedCards.push(0)
    }
    gameState = shuffle(gameState)
    console.log("creating game " + gameState)
    let room = await client
        .db("memory")
        .collection("rooms")
        .findOne({
            room_id: room_id
        })
    console.log("room.users", room)
    let points = {}
    for(let user of room.users){
        points[user] = 0
    }
    let insertedResult = await client
        .db("memory")
        .collection("game")
        .insertOne({
            room_id: room_id,
            state: gameState,
            criticalSection: 0,
            pickedCards: pickedCards,
            users: room.users,
            turn: 0, // which player is playing
            move: 0, // which card move it is 0,1
            points: points,
            moves: [

            ]
        })
    
    let game_id = insertedResult.insertedId
    let insertResult = await client
        .db("memory")
        .collection("rooms")
        .updateOne({
            room_id: room_id
        },
        {
            $addToSet: {
                games: game_id
            }
        }
    )
    return {
        game_id: game_id,
        users: room.users
    }
}


    const enableTurn = async (turn_id, room_id, users, io) => {
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

const pickCard = async(card_id, cardArray, game_id, socket, io) => {
    let game = await client.db("memory").collection("game").findOne({
        _id: new ObjectId(game_id)
    })
    
    // room_id: room_id,
    // state: gameState,
    // pickedCards: pickedCards,
    // users: room.users,
    // turn: 0, // which player is playing
    // move: 0, // which card move it is 0,1
    // points: points,
    // moves: [

    // ]
    console.log(game.pickedCards, card_id)
    if(game.pickedCards[card_id] == 1){
        console.log("card already picked", game.pickedCards[card_id])
        return
    }
    if(game.criticalSection){
        console.log("waiting for setinterval")
        return
    }
    if(game.move == 0){
        console.log("first card")
        game.pickedCards[card_id] = 1;
        game.moves.push({
           card_id: card_id,
           underlying_card: game.state[card_id]
        })
        game.move ^= 1
        let gameState = processState(game)
        console.log("sending game state", gameState)
        io.to(game.room_id).emit("emitted_current_state", gameState)
    } else {
        console.log("second card")
        let moves = game.moves
        let lastMove = moves[moves.length - 1]
        game.moves.push({
           card_id: card_id,
           underlying_card: game.state[card_id]
        })
        console.log("lastMove")
        console.log(lastMove)
        let currentCard = game.state[card_id]
        console.log(currentCard, lastMove.underlying_card)
        if(currentCard[0] == lastMove.underlying_card[0]){
            console.log("equal cards picked")
            game.pickedCards[card_id] = 1;
            game.move = 0
            game.points[socket.uid]+=1
            let gameState = processState(game)
            io.to(game.room_id).emit("emitted_current_state", gameState)
            socket.emit("update_points", game.points[socket.uid])
        } else {
     
            console.log("different cards picked")
            game.move = 0
            setTimeout(async () => {
                game.pickedCards[card_id] = 0;
                game.pickedCards[lastMove.card_id] = 0
                console.log(game.users.length)
                console.log(game.turn)
                game.turn += 1
                console.log(game.turn)
                game.turn %= game.users.length
                console.log(game.turn)
                game.criticalSection = 0
                await client.db("memory").collection("game").replaceOne({
                        _id: new ObjectId(game_id)
                    },
                    game
                )
                let gameState = processState(game)
                io.to(game.room_id).emit("emitted_current_state", gameState)
                enableTurn(game.turn, game.room_id, game.users, io)
                
            }, 1300)
            game.pickedCards[card_id] = 1;
            game.pickedCards[lastMove.card_id] = 1;
            let gameState = processState(game)
            await client.db("memory").collection("game").findOneAndUpdate({
                    _id: new ObjectId(game_id)
                },
                {   
                    $set: {
                        criticalSection: 1
                    }
                }
            )
            socket.emit("emitted_current_state", gameState)
            return 
        }
    }


    await client.db("memory").collection("game").replaceOne({
            _id: new ObjectId(game_id)
        },
        game
    )
}


module.exports = {create_game, pickCard, getGameState, enableTurn}