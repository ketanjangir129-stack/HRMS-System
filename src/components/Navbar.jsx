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
    /*
      Sticky rather than fixed, and inside the scrolling column - see
      DashboardLayout. `z-30` puts it over the page passing underneath but
      under the sidebar drawer and its backdrop, which are 50 and 40.
    */
    <div className="ui-appbar sticky top-0 z-30 h-16 shrink-0 flex justify-between items-center gap-3 sm:gap-4 px-3 sm:px-6">

      {/* List button - opens the sidebar drawer.
          Only below `lg`, where the sidebar is off screen, and to the left of
          the search box so it reads as the first control on the row. */}
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          className="ui-icon-btn shrink-0 lg:hidden"
          aria-label="Open menu"
          title="Menu"
        >
          <HiOutlineViewList size={22} />
        </button>
      )}

      {/* Search Box */}
      {/*
        A filled pill rather than an outlined box. On a bar that is itself
        translucent, a hairline border reads as a second edge under the one
        below the bar; a soft fill separates the field from the chrome
        without drawing another line across the top of the app.

        Grows to 480px but is allowed to shrink, so a narrow window keeps
        the search usable instead of pushing the actions off screen.
      */}
      <div className="group w-full max-w-120 min-w-0 h-10 flex items-center gap-2.5 px-3.5 rounded-xl bg-surface-muted border border-transparent transition-all focus-within:border-brand focus-within:bg-surface focus-within:ring-3 focus-within:ring-brand-ring">

        <FaSearch className="shrink-0 text-ink-faint text-sm" />

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full min-w-0 outline-none border-none bg-transparent text-sm text-ink placeholder:text-ink-faint"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Clear search"
            className="shrink-0 text-ink-faint hover:text-ink-muted transition cursor-pointer"
          >
            <FaTimes size={14} />
          </button>
        )}

      </div>

      {/* Right Section */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">


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
            className="ui-icon-btn"
          >
            {isDark ? <FaSun className="text-lg" /> : <FaMoon className="text-lg" />}
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
            className="ui-icon-btn hidden sm:inline-flex"
          >
            <FaCog className="text-lg" />
          </button>
        )}

        {/* A hairline between the tools and the person they belong to. */}
        <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-line sm:block" />

        {/* Profile */}
        <button
          type="button"
          onClick={handleProfileClick}
          aria-label="Open profile"
          title="Profile"
          className="flex shrink-0 cursor-pointer items-center rounded-full transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >

          <div
            className="w-9 h-9 text-sm rounded-full bg-emerald-600 text-white font-semibold flex items-center justify-center">
            {getInitials(currentUser)}
          </div>

        </button>
      </div>
      <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}

export default Navbar;