const express = require('express');
const router = express.Router()
const client = require("../apps/mongo_db")

router.get('/', async (req, res) => {
  await client.connect();
  const users = await client.db("memory")
    .collection("users")
    .find()
    .toArray()
  res.status(200).json({ "users": users })
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
module.exports = router
