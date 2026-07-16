import {
  createContext,
  useEffect,
  useState,
} from "react";

import {
  onAuthStateChanged,
} from "firebase/auth";

import { auth } from "../firebase/firebase";

import {
  loginCompany,
  logoutCompany,
} from "../services/authService.js";

import {
  getCompanyByCode,
} from "../services/companyService";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore Login Session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (user) {
          try {
            const companyData = await getCompanyByCode(
              user.uid
            );

            setCompany(companyData);
          } catch (error) {
            console.error(error);
            setCompany(null);
          }
        } else {
          setCompany(null);
        }

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Login
  const login = async (
    email,
    password,
    companyCode
  ) => {
    try {
      const result = await loginCompany(
        email,
        password
      );

      if (!result.success) {
        return result;
      }

      const companyData = await getCompanyByCode(
        result.user.uid
      );

      if (!companyData) {
        return {
          success: false,
          message: "Company not found.",
        };
      }

      if (
        companyData.companyCode !== companyCode
      ) {
        return {
          success: false,
          message: "Invalid Company Code.",
        };
      }

      if (companyData.status !== "active") {
        return {
          success: false,
          message: "Company account is inactive.",
        };
      }

      setCompany(companyData);

      return {
        success: true,
        company: companyData,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  };

  // Logout
  const logout = async () => {
    await logoutCompany();
    setCompany(null);
  };

  return (
    <AuthContext.Provider
      value={{
        company,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};