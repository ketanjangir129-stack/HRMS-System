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
            const companyCode = localStorage.getItem("companyCode");

            if (!companyCode) {
              setCompany(null);
              setLoading(false);
              return;
            }

            const companyData = await getCompanyByCode(companyCode);

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

    return unsubscribe;
  }, []);

  // Login
  const login = async (
    companyCode,
    email,
    password
  ) => {

    // Firebase Login
    const authResult = await loginCompany(
      email,
      password
    );

    if (!authResult.success) {
      return authResult;
    }

    // Database
    const company = await getCompanyByCode(
      companyCode
    );

    if (!company) {
      return {
        success: false,
        message: "Company not found.",
      };
    }

    // Verify Owner
    if (
      company.ownerUid !== authResult.user.uid
    ) {
      return {
        success: false,
        message: "Invalid Company Code.",
      };
    }

    // Status
    if (company.status !== "active") {
      return {
        success: false,
        message: "Company account is inactive.",
      };
    }

    setCompany(company);
    localStorage.setItem("companyCode", company.companyCode);

    return {
      success: true,
    };
  }
  
const logout = async () => {
  await logoutCompany();

  localStorage.removeItem("companyCode");

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

export default AuthProvider;