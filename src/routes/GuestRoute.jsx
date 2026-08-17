import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

function GuestRoute({ children }) {
    const { currentUser, loading } = useAuth();

    // Hold the login and register pages back until the Auth session has been
    // restored, so a signed-in user refreshing on /login is not shown the form
    // for a frame before being redirected.
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <div
                    className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"
                    role="status"
                    aria-label="Loading"
                />
            </div>
        );
    }

    if (currentUser) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

export default GuestRoute;
