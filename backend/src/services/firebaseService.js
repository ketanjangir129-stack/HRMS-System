const db = require("../config/firebase");

const checkFirebaseConnection = async () => {
  const snapshot = await db.ref("/").once("value");

  return {
    connected: true,
    data: snapshot.val(),
  };
};

module.exports = {
  checkFirebaseConnection,
};