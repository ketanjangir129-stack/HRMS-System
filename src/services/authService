import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { auth } from "../firebase/firebase";

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