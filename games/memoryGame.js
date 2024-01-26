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


const getGameState = async (game_id) => { 
    console.log("gameid is " + game_id)
    let state = await client.db("memory")
        .collection("game")
        .findOne(
        {
            _id: new ObjectId(game_id)
        })
    let currentState = []
    if(state){
        let gameState = state.state
        let pickedStates = state.pickedCards
        for(let s = 0; s < gameState.length; s++){
            currentState.push(gameState[s] * pickedStates[s])
        }
    }
    return currentState
}

const create_game = async (room_id, io) => {
    let gameState = []
    let pickedCards = []
    for (let i = 0; i < CARDS.length; i++) {
        gameState.push(i + 1)
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


const pickCard = async(card_id, game_id, socket, io) => {
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
    if(game.move == 0){
        game.pickedCards[card_id] = 1;
        game.moves.push({
           card_id: card_id,
           underlying_card: CARDS[game.state[card_id]]
        })
    } else {
        let moves = game.moves
        let lastMove = moves[moves.length - 1]
        socket.emit()
        console.log("lastMove")
        console.log(lastMove)
        let currentCard = CARD[game.state[card_id]]
        if(currentCard[0] == lastMove.underlying_card){
            game.move = 0
            game.points[socket.uid]++
        }
    }

    await client.db("memory").collection("game").replaceOne({
            _id: new ObjectId(game_id)
        },
        game
    )

    if(game.move == 0) {
        //firetCard
        game.move ^= 1
        let gameState = await getGameState()
        console.log("sending game state", gameState)
        io.to(game.room_id).emit("emitted_current_state", gameState)
    } else {

    }
    await client.db("memory").collection("game").replaceOne({
            _id: new ObjectId(game_id)
        },
        game
    )
}


module.exports = {create_game, pickCard, getGameState}