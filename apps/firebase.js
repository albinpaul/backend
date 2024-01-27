var admin = require("firebase-admin");
const serviceAccount = {
  'type': process.env.FIREBASE_ACCOUNT_TYPE,
  'project_id': process.env.FIREBASE_ACCOUNT_PROJECT_ID,
  'private_key_id': process.env.FIREBASE_ACCOUNT_PRIVATE_KEY_ID,
  'private_key': process.env.FIREBASE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
  'client_email': process.env.FIREBASE_ACCOUNT_CLIENT_EMAIL,
  'client_id': process.env.FIREBASE_ACCOUNT_CLIENT_ID,
  'auth_uri': process.env.FIREBASE_ACCOUNT_AUTH_URI,
  'token_uri': process.env.FIREBASE_ACCOUNT_TOKEN_URI,
  'auth_provider_x509_cert_url': process.env.FIREBASE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL,
  'client_x509_cert_url': process.env.FIREBASE_ACCOUNT_CLIENT_X509_CERT_URL,
};
const firebaseApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const auth = admin.auth(firebaseApp)
module.exports = {auth, firebaseApp}