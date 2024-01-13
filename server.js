const express = require('express');
var bodyParser = require('body-parser')
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');
const { MongoClient, ServerApiVersion } = require('mongodb');
const googleTokenVerify = require("./middlewares/googleTokenVerify")

const uri = require("./creds/db_credentials")

const app = express();
app.use(bodyParser.json())
const server = createServer(app);
const io = new Server(server);


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


app.use(googleTokenVerify);

app.get('/getUsers', async (req, res) => {
  await client.connect();
  const stream =  client.db("memory")
    .collection("users")
    .find()
    .stream()
  await stream.on("data", (doc) => {
    console.log("item")
    console.log(doc)
  })
  res.status(200).json({ "message": "interesting" })
});

app.post("/addUsers", (req, res) => {
  console.log(res.locals.uid)
    
  res.status(200).json({ "message": "interesting" })
})

io.on('connection', (socket) => {
  console.log('a user connected');
});


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("memory").command({ ping: 1 }).catch(console.error);
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    server.listen(3000, () => {
      console.log('server running at http://localhost:3000');
    });
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);

