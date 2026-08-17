import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  updatePassword,
  EmailAuthProvider,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase/firebase";
import { getUserIndex } from "./userIndexService";
import { getCompanyByCode } from "./companyService";
import { getEmployeeById, updateEmployee } from "./EmployeeService";
import {
  buildEmployeeEmail,
  isOwnerLogin,
  normalizeCompanyCode,
} from "../utils/auth/employeeIdentity";

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
| Every role — owner, HR and employee — now holds a real Firebase Auth
| account, so every database read carries a uid the security rules can check.
|
| Nothing here reads the database before signing in. That ordering is the fix:
| the old flow fetched the employee record to compare a plaintext password, and
| an unauthenticated read is precisely what the rules refuse.
|--------------------------------------------------------------------------
*/

// Firebase's own messages name internal states ("auth/invalid-credential") that
// mean nothing on a login form.
const describeAuthError = (error) => {
  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid credentials.";
    case "auth/invalid-email":
      return "Enter a valid email address or employee ID.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Try again in a few minutes.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/email-already-in-use":
      return "An account already exists for this email address.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    default:
      return error.message || "Authentication failed.";
  }
};

// Register — company owner
export const registerCompany = async (email, password) => {
  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    return {
      success: true,
      user: credential.user,
    };
  } catch (error) {
    return {
      success: false,
      message: describeAuthError(error),
      code: error.code,
    };
  }
};

export const logoutCompany = async () => {
  await signOut(auth);
};

/*
|--------------------------------------------------------------------------
| Session
|--------------------------------------------------------------------------
| Turns a signed-in uid into everything the app needs: which company, which
| role, and the user record behind it. Called on login and again on every page
| load, so a refresh rebuilds the session from the Auth token rather than from
| localStorage — which could be edited by hand and was never checked.
|--------------------------------------------------------------------------
*/
export const loadSession = async (firebaseUser) => {
  const index = await getUserIndex(firebaseUser.uid);

  if (!index) {
    return {
      success: false,
      message:
        "This sign-in is not linked to a company. If this account predates " +
        "the authentication upgrade, ask your owner to run the migration.",
    };
  }

  if (index.status && index.status !== "Active") {
    return { success: false, message: "Account is inactive." };
  }

  const company = await getCompanyByCode(index.companyCode);

  if (!company) {
    return { success: false, message: "Company not found." };
  }

  if (company.status !== "active") {
    return { success: false, message: "Company account is inactive." };
  }

  if (index.role === "owner") {
    return {
      success: true,
      role: "owner",
      companyCode: index.companyCode,
      company,
      user: {
        role: "owner",
        uid: firebaseUser.uid,
        name: company.ownerName,
        email: company.email,
      },
      isPasswordChanged: true,
    };
  }

  const employee = await getEmployeeById(index.companyCode, index.employeeId);

  if (!employee) {
    return { success: false, message: "Employee record not found." };
  }

  if (employee.account?.status && employee.account.status !== "Active") {
    return { success: false, message: "Account is inactive." };
  }

  return {
    success: true,
    role: index.role,
    companyCode: index.companyCode,
    company,
    user: {
      ...employee,
      uid: firebaseUser.uid,
      role: index.role,
    },
    isPasswordChanged: employee.account?.isPasswordChanged ?? false,
  };
};

/*
| One form, two kinds of credential. An owner types their email address; HR and
| employees type an employee ID, which maps to a per-company address Firebase
| Auth understands. See utils/auth/employeeIdentity.js.
*/
export const loginUser = async (companyCode, userId, password) => {
  const code = normalizeCompanyCode(companyCode);

  let email;

  try {
    email = isOwnerLogin(userId)
      ? String(userId).trim()
      : buildEmployeeEmail(code, userId);
  } catch {
    return { success: false, message: "Enter a valid employee ID." };
  }

  let credential;

  try {
    credential = await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    return { success: false, message: describeAuthError(error) };
  }

  const session = await loadSession(credential.user);

  if (!session.success) {
    await signOut(auth);
    return session;
  }

  /*
  | The employee address already encodes the company, but an owner's does not:
  | without this check an owner could sign in against any company code they
  | typed. The rules would still refuse the reads, so this is about giving the
  | honest mistake a clear message instead of a wall of permission errors.
  */
  if (session.companyCode !== code) {
    await signOut(auth);
    return { success: false, message: "Invalid Company Code." };
  }

  return session;
};

/*
| First-time password change for HR and employees. The password now lives in
| Firebase Auth, so this re-authenticates and calls updatePassword; the database
| only keeps the flag saying it has been done. Re-authentication is what
| verifies the current password — there is no longer a stored copy to compare.
*/
export const changeUserPassword = async ({
  companyCode,
  employeeId,
  currentPassword,
  newPassword,
}) => {
  const firebaseUser = auth.currentUser;

  if (!firebaseUser) {
    return { success: false, message: "You are not signed in." };
  }

  try {
    await reauthenticateWithCredential(
      firebaseUser,
      EmailAuthProvider.credential(firebaseUser.email, currentPassword)
    );
  } catch (error) {
    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/wrong-password"
    ) {
      return { success: false, message: "Current password is incorrect." };
    }

    return { success: false, message: describeAuthError(error) };
  }

  try {
    await updatePassword(firebaseUser, newPassword);
  } catch (error) {
    return { success: false, message: describeAuthError(error) };
  }

  await updateEmployee(companyCode, employeeId, {
    "account/isPasswordChanged": true,
  });

  return { success: true };
};
