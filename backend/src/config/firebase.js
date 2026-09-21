const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const { initializeApp, cert } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");

const serviceAccount = require("../../serviceAccountKey.json");

if (!process.env.FIREBASE_DATABASE_URL) {
  throw new Error("FIREBASE_DATABASE_URL is missing from backend/.env");
}

const firebaseApp = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = getDatabase(firebaseApp);

module.exports = db;