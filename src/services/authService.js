import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
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
| our database; the owner's is not ours to write, and a browser cannot change
| a Firebase password for somebody who is not signed in - which is exactly
| the person asking.
|
| It resolves the same way whether or not the address has an account. The
| screen that calls this says the same sentence either way on purpose: it is
| reached without signing in, so an honest "no such account" would turn it
| into a way of asking which addresses are registered.
*/
export const sendOwnerPasswordReset = async (email) => {

  try {

    await sendPasswordResetEmail(auth, String(email ?? "").trim());

    return { success: true };

  } catch (error) {

    /*
    | These two are "no such account" wearing different hats, and are
    | swallowed for the reason above. Everything else is a real failure the
    | user has to see - an offline browser, a rate limit - because claiming
    | the mail was sent would leave them waiting for nothing.
    */
    if (
      error.code === "auth/user-not-found" ||
      error.code === "auth/invalid-email"
    ) {
      return { success: true };
    }

    console.error("Failed to send owner password reset:", error);

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