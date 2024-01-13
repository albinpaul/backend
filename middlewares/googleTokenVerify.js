
const { auth } = require("../apps/firebase")

const googleTokenVerify = async (req, res, next) => {
  if(req.headers["token"] === undefined){
    res.status(400).json({error: "Token is not present in header"})
    return
  }
  const token = req.headers["token"]
  
  await auth.verifyIdToken(token)
    .then((decodedToken) => {
      console.log(decodedToken)
      res.locals.uid = decodedToken.uid
      next()
    }).catch((error) => {
      res.status(401).json({error: error})
    })
  
}
module.exports = googleTokenVerify