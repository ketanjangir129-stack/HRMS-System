import { Navigate } from "react-router-dom";

function GuestRoute({ children }) {
    const companyCode = localStorage.getItem("companyCode");

    if (companyCode) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

export default GuestRoute;