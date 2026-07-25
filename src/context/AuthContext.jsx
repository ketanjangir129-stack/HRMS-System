import {
  createContext,
  useEffect,
  useState,
} from "react";

import {
  loginUser,
  logoutCompany,
} from "../services/authService.js";

import {
  getCompanyByCode,
} from "../services/companyService";
import { updateEmployee } from "../services/EmployeeService";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/firebase";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [company, setCompany] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore Login Session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        const companyCode = localStorage.getItem("companyCode");
        const storedUser = JSON.parse(localStorage.getItem("currentUser") || "null");
        const role = localStorage.getItem("role");

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

    // Common Login
    const authResult = await loginUser(
      companyCode,
      userId,
      password
    );

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
          : loggedInUser?.account?.isPasswordChanged ?? false,
    };
  };

  // Mandatory first-time password change for HR / Employee users.
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const companyCode = localStorage.getItem("companyCode");
      const role = localStorage.getItem("role");
      const storedUser = JSON.parse(
        localStorage.getItem("currentUser") || "null"
      );

      // Owner never uses this flow.
      if (role === "owner" || !storedUser?.account) {
        return {
          success: false,
          message: "Not allowed.",
        };
      }

      if (storedUser.account.password !== currentPassword) {
        return {
          success: false,
          message: "Current password is incorrect.",
        };
      }

      const employeeId = storedUser.account.username;

      // Update ONLY the two account fields, leaving the rest of the
      // employee object untouched (Firebase multi-path update).
      await updateEmployee(companyCode, employeeId, {
        "account/password": newPassword,
        "account/isPasswordChanged": true,
      });

      const updatedUser = {
        ...storedUser,
        account: {
          ...storedUser.account,
          password: newPassword,
          isPasswordChanged: true,
        },
      };

      setCurrentUser(updatedUser);
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));

      return { success: true };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: "Failed to update password.",
      };
    }
  };

  const logout = async () => {
    const role = localStorage.getItem("role");
    // Only owner is authenticated with Firebase Auth
    if (role === "owner") {
      await logoutCompany();
    }
    localStorage.removeItem("companyCode");
    localStorage.removeItem("role");
    localStorage.removeItem("currentUser");
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;