var bodyParser = require('body-parser')
const googleTokenVerify = require("./middlewares/googleTokenVerify")
const client = require("./apps/mongo_db")
const userControllers = require("./controllers/usersControllers")
var cors = require('cors')
var corsOptions = require('./creds/corsOptions')
const {app, server}= require("./apps/express")
const io = require("./apps/socket_io")

app.use(bodyParser.json())
app.use(cors(corsOptions))
app.use(googleTokenVerify);
app.use('/users', userControllers)

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

