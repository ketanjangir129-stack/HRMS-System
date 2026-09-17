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
  updateCompanyDetails,
} from "../services/companyService";
import { updateEmployee } from "../services/EmployeeService";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/firebase";
import store from "../store";
import { stopEmployees } from "../store/employeesSlice";

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
    /*
    | Shared employee list sabse pehle saaf — Firebase sign-out se bhi
    | pehle. Ulta karte to band hota hua listener permission error bhejta
    | aur wo store mein likha rehta; aur usi tab mein agla login pichhle
    | user ki poori list memory mein pata.
    */
    store.dispatch(stopEmployees());

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
        updateCompanyProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;