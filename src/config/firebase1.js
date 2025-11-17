// --- src/config/firebase.js ---
// This file initializes the Firebase Admin SDK, giving your backend
// admin-level access to your Firestore database.

const admin = require("firebase-admin");

// You get this file from your Firebase Project Settings > Service Accounts
const serviceAccount = require("../../srtny-back-firebase-adminsdk-fbsvc-670f235282.json");

// We initialize the app using these "service account" credentials.
// This bypasses all security rules, which is what a trusted backend needs.
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// We export just the Firestore database instance for other files to use.
const db = admin.firestore();
module.exports = db;
