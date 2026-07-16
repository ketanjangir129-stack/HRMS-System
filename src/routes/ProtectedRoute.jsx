import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
    const companyCode = localStorage.getItem("companyCode");

    if (!companyCode) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

export default ProtectedRoute;