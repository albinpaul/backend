const client = require("../apps/mongo_db");
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

const create_game = (room_id) => {
    let gameState = []
    let pickedCards = []
    for (let i = 0; i < CARDS.length; i++) {
        gameState.push(i)
        pickedCards.push(0)
    }
    gameState = shuffle(gameState)
    console.log("creating game " + gameState)
    let gameCollection = client
        .db("memory")
        .collection("game")
        .insertOne({
            room_id: room_id,
            state: gameState,
            pickedCards: pickedCards
        })
}

const pickFirstCard = (card_id, io, room_id) => {
    io.room(room_id).emit("show_card", card)
}
const pickSecondCard = (card_id, socket) => {
    let card = this.cardState[card_id]
    socket.emit("show_card", card)
}


module.exports = {create_game, pickFirstCard, pickSecondCard}