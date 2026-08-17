/*
|--------------------------------------------------------------------------
| One-time authentication migration
|--------------------------------------------------------------------------
| Brings a company that predates the Firebase Auth upgrade onto the new model.
| For every existing employee it creates the Auth account they never had, links
| it through /userIndex, and deletes the plaintext password from the database.
|
| This is written to run *after* database.rules.json has been deployed, so
| there is never a window where the database sits open. That works because the
| first two writes are the bootstrap the rules deliberately allow:
|
|   1. claim /companyCodes/{code}  — permitted while the code is unclaimed
|   2. write /userIndex/{ownerUid} — the rule itself checks, server side, that
|                                    companies/{code}/details/ownerUid is this
|                                    uid, so no prior read is needed
|
| After step 2 the owner has a role the rules recognise and the rest proceeds
| normally.
|
| Safe to re-run. Every step checks for its own result first, so a run that
| fails half way can simply be repeated.
|--------------------------------------------------------------------------
*/

import { get, ref, remove, set, update } from "firebase/database";
import { db } from "../../firebase/firebase";
import { provisionAuthUser } from "../../firebase/secondaryAuth";
import {
  buildDefaultPassword,
  buildEmployeeEmail,
  normalizeCompanyCode,
} from "../auth/employeeIdentity";

// Firebase Auth's floor. A stored password shorter than this cannot be carried
// over, so those employees are reset to the standard default instead.
const MIN_PASSWORD_LENGTH = 6;

const claimCompanyCode = async (companyCode, uid) => {
  const codeRef = ref(db, `companyCodes/${companyCode}`);
  const snapshot = await get(codeRef);

  if (snapshot.exists()) {
    if (snapshot.val() !== uid) {
      throw new Error(
        `Company code ${companyCode} is already claimed by another account.`
      );
    }
    return;
  }

  await set(codeRef, uid);
};

const linkOwner = async (companyCode, uid) => {
  const indexRef = ref(db, `userIndex/${uid}`);

  if ((await get(indexRef)).exists()) {
    return;
  }

  try {
    await set(indexRef, {
      uid,
      companyCode,
      role: "owner",
      status: "Active",
      createdAt: Date.now(),
    });
  } catch (error) {
    /*
    | The rule refused it, which means the company does not name this uid as
    | its owner. Release the code claim so a mistyped code is not left locked.
    */
    await remove(ref(db, `companyCodes/${companyCode}`)).catch(() => {});

    throw new Error(
      `This account is not the registered owner of ${companyCode}. ` +
        "Sign in with the email used to register the company.",
      { cause: error }
    );
  }
};

/*
| Carries an employee across. Their existing password is reused where Firebase
| will accept it, so nobody has to be told a new one; where it is too short,
| the account is created with the standard default and the caller is told to
| pass it on.
*/
const migrateEmployee = async (companyCode, employeeId, employee) => {
  // Already migrated on an earlier run.
  if (employee.account?.uid) {
    return { employeeId, status: "skipped", reason: "Already migrated." };
  }

  const storedPassword = employee.account?.password;

  const carriedOver =
    typeof storedPassword === "string" &&
    storedPassword.length >= MIN_PASSWORD_LENGTH;

  const password = carriedOver
    ? storedPassword
    : buildDefaultPassword(employeeId);

  const provision = await provisionAuthUser(
    buildEmployeeEmail(companyCode, employeeId),
    password
  );

  if (!provision.success) {
    return {
      employeeId,
      status: "failed",
      reason: provision.message,
    };
  }

  await update(
    ref(db, `companies/${companyCode}/employees/${employeeId}/account`),
    {
      uid: provision.uid,
      // Removes the plaintext password. A null in an update() deletes the key,
      // and deletions skip the .validate rule that now forbids this field.
      password: null,
    }
  );

  await set(ref(db, `userIndex/${provision.uid}`), {
    uid: provision.uid,
    companyCode,
    employeeId,
    role: employee.account?.role || "employee",
    status: "Active",
    createdAt: Date.now(),
  });

  return {
    employeeId,
    status: "migrated",
    // Only surfaced when it changed — otherwise there is nothing to tell them.
    password: carriedOver ? null : password,
  };
};

/*
| Runs the whole migration for one company. `onProgress` is called after each
| employee so the page can show a live count.
|
| The caller must already be signed in to Firebase Auth as the company owner.
*/
export const migrateCompanyAuth = async ({ companyCode, ownerUid, onProgress }) => {
  const code = normalizeCompanyCode(companyCode);

  await claimCompanyCode(code, ownerUid);
  await linkOwner(code, ownerUid);

  const snapshot = await get(ref(db, `companies/${code}/employees`));

  if (!snapshot.exists()) {
    return { companyCode: code, results: [] };
  }

  const employees = snapshot.val();
  const employeeIds = Object.keys(employees);
  const results = [];

  /*
  | Sequential on purpose. Each iteration creates a Firebase Auth account, and
  | firing dozens of those at once trips the project's rate limit — which would
  | fail employees for a reason that has nothing to do with their data.
  */
  for (const employeeId of employeeIds) {
    try {
      results.push(
        await migrateEmployee(code, employeeId, employees[employeeId])
      );
    } catch (error) {
      results.push({
        employeeId,
        status: "failed",
        reason: error.message,
      });
    }

    onProgress?.({ done: results.length, total: employeeIds.length });
  }

  return { companyCode: code, results };
};
