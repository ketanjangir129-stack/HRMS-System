/*
|--------------------------------------------------------------------------
| Secondary auth app
|--------------------------------------------------------------------------
| createUserWithEmailAndPassword signs the *caller* in as the account it just
| created. On the primary app that would throw the HR who clicked "Add
| Employee" out of their own session and into the new employee's.
|
| A second Firebase app instance, pointed at the same project, has its own
| independent auth state. Creating the account there leaves the primary session
| untouched; we sign the throwaway session out immediately afterwards.
|
| The app is created lazily so the extra instance only exists in the sessions
| that actually add people.
|--------------------------------------------------------------------------
*/

import { getApp, getApps, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, signOut } from "firebase/auth";

const SECONDARY_APP_NAME = "hrms-user-provisioning";

const getSecondaryAuth = () => {
  const existing = getApps().find((app) => app.name === SECONDARY_APP_NAME);

  const secondaryApp = existing
    ? getApp(SECONDARY_APP_NAME)
    : initializeApp(getApp().options, SECONDARY_APP_NAME);

  return getAuth(secondaryApp);
};

/*
| Returns the new account's uid. `email-already-in-use` is surfaced as a null
| uid rather than an error: it means the Auth account outlived the employee
| record it belonged to (an employee deleted and re-added under the same ID),
| and the caller decides whether that is fatal.
*/
export const provisionAuthUser = async (email, password) => {
  const secondaryAuth = getSecondaryAuth();

  try {
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      password
    );

    return {
      success: true,
      uid: credential.user.uid,
    };
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      return {
        success: false,
        code: error.code,
        uid: null,
        message:
          "A sign-in account already exists for this employee ID. " +
          "Choose a different ID, or ask an administrator to remove the old account.",
      };
    }

    return {
      success: false,
      code: error.code,
      uid: null,
      message: error.message,
    };
  } finally {
    // Never leave the provisioning app holding a session.
    await signOut(secondaryAuth).catch(() => {});
  }
};
