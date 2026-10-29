const liveMirror = require("./liveMirror");

/*
| Ek role ki stored branch, jaisi hai waisi —
| companies/{companyCode}/settings/rolesAccess/{role}
|
| Node na ho to {}: wo company hai jisne Roles & Access kabhi configure hi
| nahi ki, aur caller defaults par gir jaata hai. Read kabhi likhta nahi,
| frontend ke roleAccessService jaisa hi.
|
| Har request par permission chahiye (middleware + service), isliye poore
| rolesAccess node ki zinda copy (liveMirror) se. Owner switch badle to
| listener ~100ms mein le aata hai — "har request par DB se, token se nahi"
| wala vaada waisa hi, bas har baar ka round trip nahi.
*/
const getRoleAccessForRole = async (companyCode, role) => {
  const snapshot = await liveMirror.snapshot(`companies/${companyCode}/settings/rolesAccess`);

  return snapshot.child(String(role)).val() || {};
};

module.exports = {
  getRoleAccessForRole,
};
