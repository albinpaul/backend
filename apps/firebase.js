var admin = require("firebase-admin");
var serviceAccount = require("../creds/serviceAccountKey.json");
const firebaseApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const auth = admin.auth(firebaseApp)
module.exports = {auth, firebaseApp}