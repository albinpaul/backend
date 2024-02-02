var bodyParser = require('body-parser')
const googleTokenVerify = require("./middlewares/googleTokenVerify")
const client = require("./apps/mongo_db")
const userControllers = require("./controllers/usersControllers")
var cors = require('cors')
const {app, server}= require("./apps/express")
const io = require("./apps/socket_io")
if(process.env.ENABLE_LOG){
  require("./middlewares/logToFile")
}

app.use(bodyParser.json())
app.use(cors({
    origin: process.env.COORS_ORIGIN, 
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}))
app.use(googleTokenVerify);
app.use('/users', userControllers)

async function run() {
  try {
    await client.connect();
    await client.db("memory").command({ ping: 1 }).catch(console.error);
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    server.listen(process.env.PORT, () => {
      console.log('server running at http://localhost:' + process.env.PORT);
    });
  } finally {
    await client.close();
  }
}
run().catch(console.dir);

