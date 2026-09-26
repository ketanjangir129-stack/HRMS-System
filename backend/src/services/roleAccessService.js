const db = require("../config/firebase");

/*
| Ek role ki stored branch, jaisi hai waisi —
| companies/{companyCode}/settings/rolesAccess/{role}
|
| Node na ho to {}: wo company hai jisne Roles & Access kabhi configure hi
| nahi ki, aur caller defaults par gir jaata hai. Read kabhi likhta nahi,
| frontend ke roleAccessService jaisa hi.
*/
const getRoleAccessForRole = async (companyCode, role) => {
  const snapshot = await db
    .ref(`companies/${companyCode}/settings/rolesAccess/${role}`)
    .once("value");

  return snapshot.val() || {};
};

module.exports = {
  getRoleAccessForRole,
};
