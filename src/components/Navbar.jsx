import {
  FaSearch,
  FaBell,
  FaCog,
  FaTimes,
  FaSun,
  FaMoon
} from "react-icons/fa";
import { HiOutlineViewList } from "react-icons/hi";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useRoleAccess from "../hooks/useRoleAccess";
import useTheme from "../hooks/useTheme";
import { THEME_ENABLED } from "../context/ThemeContext";
import ProfileDrawer from "./ProfileDrawer";
import { getInitials } from "../utils/user";
import NotificationBell from "./notifications/NotificationBell";


const Navbar = ({ search, setSearch, searchPlaceholder, onMenuClick }) => {
  const navigate = useNavigate();
  const { isOwner } = useRoleAccess();
  const { currentUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  // Profile icon par click karne se right side ka drawer khulta hai
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleProfileClick = () => setIsProfileOpen(true);

  return (
    <div className="h-[70px] shrink-0 bg-surface flex justify-between items-center gap-3 sm:gap-4 px-3 sm:px-8 border-b border-line">

      {/* List button - opens the sidebar drawer.
          Only below `lg`, where the sidebar is off screen, and to the left of
          the search box so it reads as the first control on the row. */}
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-surface-muted text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink focus:outline-none focus:ring-2 focus:ring-blue-500 lg:hidden"
          aria-label="Open menu"
          title="Menu"
        >
          <HiOutlineViewList size={24} />
        </button>
      )}

      {/* Search Box */}
      {/* Grows to 700px but is allowed to shrink, so a narrow window keeps
          the search usable instead of pushing the actions off screen. */}
      <div className="w-full max-w-[700px] min-w-0 h-11 sm:h-12 flex items-center px-3 sm:px-5 border border-line rounded-2xl bg-surface">

        <FaSearch className="shrink-0 text-ink-faint text-base sm:text-lg" />

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full min-w-0 ml-2 sm:ml-3 outline-none border-none bg-transparent text-sm sm:text-[15px] placeholder:text-ink-faint"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="text-ink-faint hover:text-ink-muted transition cursor-pointer"
          >
            <FaTimes size={20} />
          </button>
        )}

      </div>

      {/* Right Section */}
      <div className="flex shrink-0 items-center gap-4 sm:gap-4">


        {/* Theme - light or dark, remembered on this device. Offered to every
            role and at every width, unlike the owner-only cog below.

            Hidden while THEME_ENABLED is false: the pages inside the shell
            are still on their old light colours, so there is nothing worth
            switching to yet. The button comes back with that one flag. */}
        {THEME_ENABLED && (
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Light mode" : "Dark mode"}
            className="cursor-pointer text-ink-subtle transition-colors hover:text-brand"
          >
            {isDark ? <FaSun className="text-xl" /> : <FaMoon className="text-xl" />}
          </button>
        )}

        {/* Notification */}
        <NotificationBell />
        {/* <div className="relative cursor-pointer">
          <FaBell className="text-lg sm:text-xl text-gray-600" />

          <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center">
            3
          </span>
        </div> */}


        {/* Settings - the cog is where Roles & Access lives, so it is the
            owner's only. */}
        {isOwner && (
          <button
            type="button"
            onClick={() => navigate("/settings")}
            aria-label="Settings"
            title="Settings"
            className="hidden sm:block cursor-pointer text-ink-subtle transition-colors hover:text-blue-600"
          >
            <FaCog className="text-xl" />
          </button>
        )}
        {/* Profile */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={handleProfileClick}>

          <div
            className="w-9 h-9 sm:w-11 sm:h-11 text-sm sm:text-base rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center">
            {getInitials(currentUser)}
          </div>

        </div>
      </div>
      <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}

export default Navbar;