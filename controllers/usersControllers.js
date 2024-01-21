const express = require('express');
const router = express.Router()
const client = require("../apps/mongo_db")

router.get('/', async (req, res) => {
  await client.connect();
  const uid = res.locals.uid
  const user = await client.db("memory")
    .collection("users")
    .findOne({uid: uid})
  if(user){
    res.status(200).json({ "user": user})
  } else {
    res.status(404).json({"messsage": "user not found"})
  }
});

router.post("/", async (req, res) => {
  const uid = res.locals.uid
  await client.connect();
  const user = await client.db("memory")
    .collection("users")
    .findOne({
      "uid": uid
    })
    
  if (!user) {
    await client.db("memory")
      .collection("users")
      .insertOne({
        "uid": uid
    })
    res.status(200).json({message: "created user"})
  } else {
    res.status(200).json({message: "user already present"})
  }
})

router.delete("/:room_id", async (req, res) => {
  const uid = res.locals.uid
  const room_id = req.params.room_id
  console.log("deleting rooms " + room_id)
  await client.connect();
  const deleted = await client.db("memory")
    .collection("users")
    .updateOne({
        "uid": uid,
      },
      {
        $pull: {
          "rooms": room_id
        }
      }
    )
  const rooms = await client.db("memory")
    .collection("rooms")
    .updateOne({
        "room_id": room_id,
      },
      {
        $pull: {
          "users": uid
        }
      }
    )
  if (deleted) {
    await client.db("memory")
      .collection("rooms")
      .deleteMany({ users: { $exists: true, $size: 0 } });
    res.status(200).json({message: "deleted room"})
  } else {
    res.status(400).json({message: "some issue"})
  }
})
module.exports = router
