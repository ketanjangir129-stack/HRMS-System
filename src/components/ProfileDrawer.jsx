import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, LogOut, UserRound } from "lucide-react";
import { toast } from "react-toastify";
import useAuth from "../hooks/useAuth";
import { getInitials, getUserName } from "../utils/user";

/*
|--------------------------------------------------------------------------
| Profile Drawer
|--------------------------------------------------------------------------
| Navbar ke profile icon se khulne wala right side panel: apni profile kholo
| ya logout karo. Details khud yahan nahi dikhti — woh `/profile` page par
| hain, taaki refresh aur bookmark dono kaam karein.
|--------------------------------------------------------------------------
*/

const ProfileDrawer = ({ isOpen, onClose }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loggingOut, setLoggingOut] = useState(false);

  // Esc se drawer band ho jaye
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const name = getUserName(currentUser);
  const initials = getInitials(currentUser);
  const role = currentUser?.account?.role || currentUser?.role || "—";

  const handleViewProfile = () => {
    onClose();

    // Profile page ka Back button isi page par wapas laata hai
    navigate("/profile", { state: { from: location.pathname } });
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      // logout() Firebase session (owner) band karke companyCode / role /
      // currentUser localStorage se hata deta hai.
      await logout();
      onClose();
      navigate("/login", { replace: true });
      toast.success("Logged Out Successfully");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Logout failed. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Right side drawer */}
      <aside
        role="dialog"
        aria-label="Profile"
        className={`fixed right-0 top-0 z-50 flex h-dvh w-full max-w-70 flex-col bg-surface shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header + back button */}
        <div className="flex items-center gap-3 border-b border-line px-4 py-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-subtle transition hover:bg-surface-muted hover:text-ink cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <h2 className="text-base font-semibold text-ink">Profile</h2>
        </div>

        {/* User card */}
        <div className="flex items-center gap-3 border-b border-line-subtle px-4 py-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-lg font-bold text-white">
            {initials}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{name}</p>
            <p className="truncate text-xs capitalize text-ink-subtle">{role}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col p-3">
          <button
            type="button"
            onClick={handleViewProfile}
            className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-surface-muted cursor-pointer"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                <UserRound className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-ink-muted">
                View Profile Info
              </span>
            </span>

            <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-red-50 dark:hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300">
              <LogOut className="h-4 w-4" />
            </span>
            <span className="text-sm font-medium text-red-600 dark:text-red-400">
              {loggingOut ? "Logging out…" : "Logout"}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default ProfileDrawer;
