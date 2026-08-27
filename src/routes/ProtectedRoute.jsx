import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
    const companyCode = localStorage.getItem("companyCode");

    if (!companyCode) {
        return <Navigate to="/login" replace />;
    }

    // HR / Employee cannot access protected pages until they change the
    // default password. Owner has no account object and bypasses this.
    const role = localStorage.getItem("role");
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

    if (role !== "owner" && currentUser?.account?.isPasswordChanged === false) {
        return <Navigate to="/change-password" replace />;
    }

    return children;
}

export default ProtectedRoute;