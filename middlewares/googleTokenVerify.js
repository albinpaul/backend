
const { auth } = require("../apps/firebase")

const googleTokenVerify = async (req, res, next) => {
  await auth.verifyIdToken(req.body.token)
    .then((decodedToken) => {
      console.log(decodedToken)
      next()
    }).catch((error) => {
      res.status(401).json({error: error})
      console.error(error)
    })
  
}
module.exports = googleTokenVerify