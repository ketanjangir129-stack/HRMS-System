import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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