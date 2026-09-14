import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase/firebase";
import { db } from "../firebase/firebase";
import { ref, get } from "firebase/database";

// Register
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
      message: error.message,
      code: error.code,
    };
  }
};

// Login
export const loginCompany = async (email, password) => {
  try {
    const credential = await signInWithEmailAndPassword(
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
      message: error.message,
      code: error.code,
    };
  }
};

// Logout
export const logoutCompany = async () => {
  await signOut(auth);
};

/*
|--------------------------------------------------------------------------
| Owner Password Reset
|--------------------------------------------------------------------------
| The owner is the one account this app keeps in Firebase Auth, so their
| forgotten password is the one case we hand over entirely: Firebase makes
| the link, sends the mail and hosts the page it opens.
|
| That is why there is no company code here and no template of ours. An
| employee's reset is ours end to end because their password is a value in
| our database; the owner's is not ours to write directly, and a browser
| cannot change a Firebase password for somebody who is not signed in.
|
| What the two functions beneath this one buy back is the screen. Firebase
| puts an `oobCode` in the link it mails, and that code is a one-use licence
| to set this account's password - so with the Console's action URL pointed
| at our own `/reset-password`, the owner lands on the same page everybody
| else does and only the email is still Firebase's.
|
| A missing account is reported rather than swallowed, matching the employee
| side: the screen that calls this names what it could not find so a mistyped
| address is a correctable mistake instead of an inbox watched for nothing.
|
| Reaching this at all means the address already matched the one on the
| company record, so the only way Firebase can answer "no such user" is if
| that account was deleted out from under the company - a broken state worth
| saying out loud rather than papering over with a link that never comes.
*/
export const sendOwnerPasswordReset = async (email) => {

  try {

    await sendPasswordResetEmail(auth, String(email ?? "").trim());

    return { success: true };

  } catch (error) {

    console.error("Failed to send owner password reset:", error);

    if (
      error.code === "auth/user-not-found" ||
      error.code === "auth/invalid-email"
    ) {
      return {
        success: false,
        message:
          "No sign-in account found for this email. Please contact your administrator.",
      };
    }

    return {
      success: false,
      message:
        error.code === "auth/too-many-requests"
          ? "Too many attempts. Please wait a few minutes and try again."
          : "Could not send the reset email. Please try again.",
      code: error.code,
    };

  }

};

/*
| Whether the code in a link is still good, asked before the form is drawn.
|
| Firebase answers with the address the code belongs to, which is what lets
| the page name the account it is about to change - the same line the employee
| side prints from its own record.
|
| Every refusal comes back as one message. Expired, already used and tampered
| with are the same thing to the person reading it, and there is nothing they
| could do differently on being told which.
*/
export const verifyOwnerResetCode = async (oobCode) => {

  try {

    const email = await verifyPasswordResetCode(auth, oobCode);

    return { valid: true, email };

  } catch (error) {

    console.error("Invalid owner reset code:", error);

    return {
      valid: false,
      message:
        "This password reset link is no longer valid. It may have expired or already been used.",
    };

  }

};

/*
| Spending the code. Firebase invalidates it as it writes, so the link is
| single use without anything here having to remember that it was used - the
| same property the employee side gets by clearing the stored hash.
|
| The owner is not signed in afterwards. That is Firebase's behaviour and it
| is the right one: the page sends them to sign in with the password they
| have just chosen, which is also the first proof that it took.
*/
export const confirmOwnerPasswordReset = async (oobCode, newPassword) => {

  try {

    await confirmPasswordReset(auth, oobCode, newPassword);

    return { success: true };

  } catch (error) {

    if (error.code === "auth/weak-password") {
      return {
        success: false,
        message: "That password is too weak. Please choose a stronger one.",
      };
    }

    console.error("Failed to reset owner password:", error);

    /*
    | Anything else is the code having gone stale between the page opening and
    | the form being submitted - most often because it was used in another tab
    | while this one sat waiting.
    */
    return {
      success: false,
      message:
        "This password reset link is no longer valid. It may have expired or already been used.",
    };

  }

};

//login Employee
export const loginEmployee = async (
    companyCode,
    employeeId,
    password
) => {

    try {

        const snapshot = await get(
            ref(
                db,
                `companies/${companyCode}/employees/${employeeId.toUpperCase()}`
            )
        );

        if (!snapshot.exists()) {

            return {
                success: false,
                message: "Employee not found.",
            };

        }

        const employee = snapshot.val();

        if (employee.account.status !== "Active") {

            return {
                success: false,
                message: "Account is inactive.",
            };

        }

        if (employee.account.password !== password) {

            return {
                success: false,
                message: "Invalid password.",
            };

        }

        return {

            success: true,

            user: employee,

            role: employee.account.role,

        };

    }

    catch (error) {

        return {

            success: false,

            message: error.message,

        };

    }

};

export const loginUser = async (
    companyCode,
    userId,
    password
) => {

    // -----------------------
    // Company Login
    // -----------------------
    if (userId.includes("@")) {

        const authResult = await loginCompany(
            userId,
            password
        );

        if (!authResult.success) {
            return authResult;
        }

        // Find company by companyCode
        const companySnapshot = await get(
            ref(
                db,
                `companies/${companyCode}`
            )
        );

        if (!companySnapshot.exists()) {
            return {
                success: false,
                message: "Company not found.",
            };
        }

        const company = companySnapshot.val();
        const details = company.details;

        if (
            details.email.toLowerCase() !==
            userId.toLowerCase()
        ) {
            return {
                success: false,
                message: "Company credentials are invalid.",
            };
        }

        return {
            success: true,
            role: "owner",
            user: { ...details, uid: authResult.user.uid },
        };
    }

    // -----------------------
    // Employee Login
    // -----------------------
    return await loginEmployee(
        companyCode,
        userId,
        password
    );
};