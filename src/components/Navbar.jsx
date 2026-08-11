import {
  FaSearch,
  FaBell,
  FaCog,
  FaTimes
} from "react-icons/fa";
import { HiOutlineViewList } from "react-icons/hi";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useRoleAccess from "../hooks/useRoleAccess";
import ProfileDrawer from "./ProfileDrawer";
import { getInitials } from "../utils/user";


const Navbar = ({ search, setSearch, searchPlaceholder, onMenuClick }) => {
  const navigate = useNavigate();
  const { isOwner } = useRoleAccess();
  const { currentUser } = useAuth();

  // Profile icon par click karne se right side ka drawer khulta hai
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleProfileClick = () => setIsProfileOpen(true);

  return (
    <div className="h-[70px] shrink-0 bg-white flex justify-between items-center gap-3 sm:gap-4 px-3 sm:px-8 border-b border-gray-200">

      {/* List button - opens the sidebar drawer.
          Only below `lg`, where the sidebar is off screen, and to the left of
          the search box so it reads as the first control on the row. */}
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-gray-100 text-slate-700 transition-colors hover:bg-gray-200 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 lg:hidden"
          aria-label="Open menu"
          title="Menu"
        >
          <HiOutlineViewList size={24} />
        </button>
      )}

      {/* Search Box */}
      {/* Grows to 700px but is allowed to shrink, so a narrow window keeps
          the search usable instead of pushing the actions off screen. */}
      <div className="w-full max-w-[700px] min-w-0 h-11 sm:h-12 flex items-center px-3 sm:px-5 border border-gray-300 rounded-2xl bg-white">

        <FaSearch className="shrink-0 text-gray-400 text-base sm:text-lg" />

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full min-w-0 ml-2 sm:ml-3 outline-none border-none bg-transparent text-sm sm:text-[15px]"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="text-gray-400 hover:text-gray-600 transition cursor-pointer"
          >
            <FaTimes size={20} />
          </button>
        )}

      </div>

      {/* Right Section */}
      <div className="flex shrink-0 items-center gap-4 sm:gap-7">
        {/* Notification */}
        <div className="relative cursor-pointer">
          <FaBell className="text-lg sm:text-xl text-gray-600" />

          <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center">
            3
          </span>
        </div>
        {/* Settings - the cog is where Roles & Access lives, so it is the
            owner's only. */}
        {isOwner && (
          <button
            type="button"
            onClick={() => navigate("/settings")}
            aria-label="Settings"
            title="Settings"
            className="hidden sm:block cursor-pointer text-gray-600 transition-colors hover:text-blue-600"
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