/*
|--------------------------------------------------------------------------
| User index
|--------------------------------------------------------------------------
| /userIndex/{uid} -> { uid, companyCode, role, employeeId, status }
|
| A Firebase Auth token carries a uid and nothing else. Every security rule in
| database.rules.json needs to know which company that uid belongs to and what
| it may do there, so this node is the one place that answers it — and the one
| node the rules read on every single request.
|
| It is deliberately not derived from the employee record: rules can only look
| things up by key, and there is no way to search `employees` for a matching
| uid. Keeping a flat uid-keyed row makes every rule a single child() lookup.
|
| A client cannot forge its own row. The rules accept an `owner` row only once
| the company already names that uid as its owner, and hr/employee rows only
| from a manager of the same company.
|--------------------------------------------------------------------------
*/

import { ref, get, set, remove, update } from "firebase/database";
import { db } from "../firebase/firebase";

const userPath = (uid) => `userIndex/${uid}`;

export const getUserIndex = async (uid) => {
  const snapshot = await get(ref(db, userPath(uid)));

  return snapshot.exists() ? snapshot.val() : null;
};

export const createOwnerIndex = async ({ uid, companyCode }) => {
  await set(ref(db, userPath(uid)), {
    uid,
    companyCode,
    role: "owner",
    status: "Active",
    createdAt: Date.now(),
  });
};

export const createEmployeeIndex = async ({
  uid,
  companyCode,
  employeeId,
  role,
}) => {
  await set(ref(db, userPath(uid)), {
    uid,
    companyCode,
    employeeId,
    role,
    status: "Active",
    createdAt: Date.now(),
  });
};

/*
| Role and status live in two places — on the employee record, where HR edits
| them, and here, where the rules read them. Whenever the first changes the
| second has to follow, or a demoted HR keeps their old access.
*/
export const syncUserIndex = async (uid, changes) => {
  await update(ref(db, userPath(uid)), changes);
};

export const removeUserIndex = async (uid) => {
  await remove(ref(db, userPath(uid)));
};
