import {
  createContext,
  useEffect,
  useState,
} from "react";

import {
  loginCompany,
  logoutCompany,
} from "../services/authService.js";

import {
  loginEmployeeApi,
  changePasswordApi,
} from "../services/api/authApi.js";
import { getCurrentUserApi } from "../services/api/authApi.js";
import {
  getCompanyByCode,
  updateCompanyDetails,
} from "../services/companyService";
import { updateEmployee } from "../services/EmployeeService";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/firebase";
import store from "../store";
import { stopEmployees } from "../store/employeesSlice";
import { stopDepartments } from "../store/departmentsSlice.js";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [company, setCompany] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore Login Session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        let companyCode = localStorage.getItem("companyCode");
        let storedUser = JSON.parse(localStorage.getItem("currentUser") || "null");
        let role = localStorage.getItem("role");
        const token = localStorage.getItem("authToken");

        const clearSession = () => {
          localStorage.removeItem("authToken");
          localStorage.removeItem("currentUser");
          localStorage.removeItem("companyCode");
          localStorage.removeItem("role");
          setCurrentUser(null);
          setCompany(null);
        };

        // HR / Employee: the token is the session. The backend decides who the
        // user is, and currentUser / role / companyCode in localStorage are
        // only a cache rebuilt from its response — so deleting or editing them
        // doesn't log the user out, and can't impersonate anyone either.
        if (role !== "owner") {
          if (!token) {
            // Role left behind without a token => stale session.
            if (role) clearSession();
            else {
              setCompany(null);
              setCurrentUser(null);
            }
            return;
          }

          const result = await getCurrentUserApi();

          if (!result.success || !result.user) {
            clearSession();
            return;
          }

          // A companyCode that disagrees with the token was tampered with.
          if (
            companyCode &&
            String(result.user.companyCode).toLowerCase() !==
              String(companyCode).toLowerCase()
          ) {
            clearSession();
            return;
          }

          storedUser = result.user;
          role = result.user.role;
          companyCode = result.user.companyCode;

          localStorage.setItem("currentUser", JSON.stringify(storedUser));
          localStorage.setItem("role", role);
          localStorage.setItem("companyCode", companyCode);
        }

        if (!companyCode) {
          setCompany(null);
          setCurrentUser(null);
          setLoading(false);
          return;
        }

        const companyData = await getCompanyByCode(companyCode);

        if (!companyData) {
          localStorage.clear();
          setCompany(null);
          setCurrentUser(null);
          setLoading(false);
          return;
        }

        setCompany(companyData);

        if (role === "owner") {
          // Owner must have an active Firebase Auth session
          if (!firebaseUser) {
            localStorage.clear();
            setCompany(null);
            setCurrentUser(null);
          } else {
            setCurrentUser(storedUser);
          }
        } else {
          // HR / Employee use custom authentication
          if (storedUser) {
            setCurrentUser(storedUser);
          }
        }
      } catch (error) {
        console.error(error);
        localStorage.clear();
        setCompany(null);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Login
  const login = async (
    companyCode,
    userId,
    password
  ) => {



    let authResult;

    // Owner Login

    if (userId.includes("@")) {
      authResult = await loginCompany(
        userId,
        password
      );

    } else {
      // Employee / HR / Manager login → Backend API
      authResult = await loginEmployeeApi(
        companyCode,
        userId,
        password
      );
    }
    if (authResult.role !== "owner" && authResult.token) {
      localStorage.setItem(
        "authToken",
        authResult.token
      );
    }

    if (!authResult.success) {
      return authResult;
    }

    // Load company
    const company = await getCompanyByCode(companyCode);

    if (!company) {
      return {
        success: false,
        message: "Company not found.",
      };
    }

    if (company.status !== "active") {
      return {
        success: false,
        message: "Company account is inactive.",
      };
    }

    // Owner Validation
    if (
      authResult.role === "owner" &&
      company.ownerUid !== authResult.user.uid
    ) {
      return {
        success: false,
        message: "Invalid Company Code.",
      };
    }

    const loggedInUser =
      authResult.role === "owner"
        ? {
          role: "owner",
          name: company.ownerName,
          email: company.email,
        }
        : authResult.user;

    setCompany(company);
    setCurrentUser(loggedInUser);

    localStorage.setItem("companyCode", company.companyCode);
    localStorage.setItem("role", authResult.role);
    localStorage.setItem(
      "currentUser",
      JSON.stringify(loggedInUser)
    );

    return {
      success: true,
      role: authResult.role,
      isPasswordChanged:
        authResult.role === "owner"
          ? true
          : loggedInUser?.isPasswordChanged ?? false,
    };
  };

  /*
  | Owner ki apni profile edit — company details me jaati hai, kyunki owner ka
  | koi employee record hota hi nahi.
  |
  | Naam yahan currentUser me bhi copy hota hai: login ne `name` company ke
  | ownerName se banaya tha, aur navbar/profile drawer wahi currentUser padhte
  | hain. Sirf company state badalte to owner apna naam save karke bhi navbar
  | me purana naam dekhta rehta — agle login tak.
  */
  const updateCompanyProfile = async (updates) => {
    try {
      const companyCode =
        company?.companyCode || localStorage.getItem("companyCode");
      const role = localStorage.getItem("role");

      // Sirf owner. HR/Employee apni details employee record me badalte hain.
      if (role !== "owner" || !companyCode) {
        return {
          success: false,
          message: "Not allowed.",
        };
      }

      const result = await updateCompanyDetails(companyCode, updates);

      if (!result.success) {
        return result;
      }

      setCompany(result.data);

      const updatedUser = {
        ...(currentUser || {}),
        role: "owner",
        name: result.data.ownerName,
        email: result.data.email,
      };

      setCurrentUser(updatedUser);
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));

      return result;
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: "Failed to update profile.",
      };
    }
  };

  // Mandatory first-time password change for HR / Employee users.
  const changePassword = async (
    currentPassword,
    newPassword
  ) => {
    try {
      const companyCode =
        localStorage.getItem("companyCode");

      const storedUser = JSON.parse(
        localStorage.getItem("currentUser") || "null"
      );

      if (!companyCode || !storedUser) {
        return {
          success: false,
          message: "User session not found.",
        };
      }

      // Owner password change is handled separately
      if (storedUser.role === "owner") {
        return {
          success: false,
          message: "Not allowed.",
        };
      }

      const employeeId = storedUser.employeeId;

      if (!employeeId) {
        return {
          success: false,
          message: "Employee ID not found.",
        };
      }

      const result = await changePasswordApi(
        companyCode,
        employeeId,
        currentPassword,
        newPassword
      );

      if (!result.success) {
        return result;
      }

      // Update local user information
      const updatedUser = {
        ...storedUser,
        isPasswordChanged: true,
      };

      setCurrentUser(updatedUser);

      localStorage.setItem(
        "currentUser",
        JSON.stringify(updatedUser)
      );

      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      console.error(
        "Change password error:",
        error
      );

      return {
        success: false,
        message: "Failed to update password.",
      };
    }
  };

  const logout = async () => {
    /*
    | Shared employee list sabse pehle saaf — Firebase sign-out se bhi
    | pehle. Ulta karte to band hota hua listener permission error bhejta
    | aur wo store mein likha rehta; aur usi tab mein agla login pichhle
    | user ki poori list memory mein pata.
    */
    store.dispatch(stopEmployees());
    store.dispatch(stopDepartments());

    const role = localStorage.getItem("role");
    // Only owner is authenticated with Firebase Auth
    if (role === "owner") {
      await logoutCompany();
    }
    localStorage.removeItem("companyCode");
    localStorage.removeItem("role");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("authToken");
    setCompany(null);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        company,
        currentUser,
        loading,
        login,
        logout,
        changePassword,
        updateCompanyProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;