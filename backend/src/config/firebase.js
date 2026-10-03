const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const { initializeApp, cert } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");

// const serviceAccount = require("../../serviceAccountKey.json");

if (!process.env.FIREBASE_DATABASE_URL|| !process.env.FIREBASE_PROJECT_ID|| !process.env.FIREBASE_CLIENT_EMAIL ||!process.env.FIREBASE_PRIVATE_KEY) {
  throw new Error("Firebase environment variables are missing");
}

const firebaseApp = initializeApp({
  credential: cert({
       projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = getDatabase(firebaseApp);

module.exports = db;