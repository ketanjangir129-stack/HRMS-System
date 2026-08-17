import {
  createContext,
  useEffect,
  useState,
} from "react";

import {
  loginUser,
  logoutCompany,
  loadSession,
  changeUserPassword,
} from "../services/authService.js";

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/firebase";

export const AuthContext = createContext();

/*
|--------------------------------------------------------------------------
| Auth context
|--------------------------------------------------------------------------
| The session is rebuilt from the Firebase Auth token, not from localStorage.
| Previously the company and role were read straight out of localStorage and
| trusted; a user could edit either one, and on refresh the app issued a
| database read before it knew whether anybody was signed in at all — which is
| where the "Permission denied" came from.
|
| Now onAuthStateChanged is the only entry point. No token, no reads.
|--------------------------------------------------------------------------
*/

/*
| Roughly two dozen screens still read companyCode / role / currentUser out of
| localStorage. Those keys are now a *mirror* of the authenticated session
| rather than the session itself: written only after loadSession has succeeded
| against a real Auth token, and wiped the moment it has not. Nothing is
| granted on their say-so any more — the route guards read the context, and the
| database rules read the token — so a hand-edited value buys an attacker
| nothing but a broken screen.
*/
const mirrorSession = (session) => {
  localStorage.setItem("companyCode", session.companyCode);
  localStorage.setItem("role", session.role);
  localStorage.setItem("currentUser", JSON.stringify(session.user));
};

const clearMirror = () => {
  localStorage.removeItem("companyCode");
  localStorage.removeItem("role");
  localStorage.removeItem("currentUser");
};

export const AuthProvider = ({ children }) => {
  const [company, setCompany] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [companyCode, setCompanyCode] = useState(null);
  const [loading, setLoading] = useState(true);

  const applySession = (session) => {
    setCompany(session.company);
    setCurrentUser(session.user);
    setCompanyCode(session.companyCode);
    mirrorSession(session);
  };

  const clearSession = () => {
    setCompany(null);
    setCurrentUser(null);
    setCompanyCode(null);
    clearMirror();
  };

  // Restore Login Session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Signed out, or never signed in. Nothing to fetch.
      if (!firebaseUser) {
        clearSession();
        setLoading(false);
        return;
      }

      try {
        const session = await loadSession(firebaseUser);

        if (!session.success) {
          clearSession();
          return;
        }

        applySession(session);
      } catch (error) {
        /*
        | A transient failure here — offline, a slow rule evaluation — used to
        | run localStorage.clear() and sign the user out for good. Drop the
        | in-memory session so nothing renders against half-loaded data, but
        | leave the Auth token alone: the next successful load restores it.
        */
        console.error("Failed to restore session:", error);
        clearSession();
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  /*
  | Signs in and returns the session. onAuthStateChanged fires for the same
  | sign-in and hydrates state again; both paths call loadSession and produce
  | the same result, so the duplicate is harmless and keeps the redirect below
  | from having to wait on the listener.
  */
  const login = async (companyCodeInput, userId, password) => {
    const session = await loginUser(companyCodeInput, userId, password);

    if (!session.success) {
      return session;
    }

    applySession(session);

    return {
      success: true,
      role: session.role,
      isPasswordChanged: session.isPasswordChanged,
    };
  };

  // Mandatory first-time password change for HR / Employee users.
  const changePassword = async (currentPassword, newPassword) => {
    if (currentUser?.role === "owner") {
      return { success: false, message: "Not allowed." };
    }

    const employeeId = currentUser?.employmentInfo?.employeeId;

    if (!companyCode || !employeeId) {
      return { success: false, message: "Not allowed." };
    }

    const result = await changeUserPassword({
      companyCode,
      employeeId,
      currentPassword,
      newPassword,
    });

    if (!result.success) {
      return result;
    }

    setCurrentUser((user) => {
      const updated = {
        ...user,
        account: {
          ...user.account,
          isPasswordChanged: true,
        },
      };

      // Keep the mirror in step, or ProtectedRoute bounces the user straight
      // back to /change-password on the next navigation.
      localStorage.setItem("currentUser", JSON.stringify(updated));

      return updated;
    });

    return { success: true };
  };

  const logout = async () => {
    // onAuthStateChanged clears the session once the sign-out lands.
    await logoutCompany();
    clearSession();
  };

  return (
    <AuthContext.Provider
      value={{
        company,
        companyCode,
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
