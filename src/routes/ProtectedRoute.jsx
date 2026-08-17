import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

/*
| Reads the context rather than localStorage. Restoring a Firebase Auth session
| is asynchronous, so on a page refresh there is a moment where the user is
| signed in but the app does not know it yet — the old synchronous localStorage
| check either let that through on a stale key or bounced a signed-in user to
| /login. Waiting on `loading` is what removes the race.
*/
function ProtectedRoute({ children }) {
    const { currentUser, loading } = useAuth();

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

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    // HR / Employee cannot access protected pages until they change the
    // default password. Owner has no account object and bypasses this.
    if (
        currentUser.role !== "owner" &&
        currentUser.account?.isPasswordChanged === false
    ) {
        return <Navigate to="/change-password" replace />;
    }

    return children;
}

export default ProtectedRoute;
