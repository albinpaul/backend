const express = require('express');
var bodyParser = require('body-parser')
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');
const googleTokenVerify = require("./middlewares/googleTokenVerify")
const client = require("./apps/mongo_db")
const userControllers = require("./controllers/usersControllers")
var cors = require('cors')
var corsOptions = require('./creds/corsOptions')

const app = express();
app.use(bodyParser.json())
const server = createServer(app);
const io = new Server(server);

app.use(cors(corsOptions))
app.use(googleTokenVerify);

app.use('/users', userControllers)

io.on('connection', (socket) => {
  console.log('a user connected');
});


async function run() {
  try {
    await client.connect();
    await client.db("memory").command({ ping: 1 }).catch(console.error);
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    server.listen(3000, () => {
      console.log('server running at http://localhost:3000');
    });
  } finally {
    await client.close();
  }
}
run().catch(console.dir);

