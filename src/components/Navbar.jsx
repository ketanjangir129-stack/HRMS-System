import {
  FaSearch,
  FaBell,
  FaCog,
  FaTimes
} from "react-icons/fa";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useRoleAccess from "../hooks/useRoleAccess";
import ProfileDrawer from "./ProfileDrawer";
import { getInitials } from "../utils/user";


const Navbar = ({ search, setSearch, searchPlaceholder }) => {
  const navigate = useNavigate();
  const { isOwner } = useRoleAccess();
  const { currentUser } = useAuth();

  // Profile icon par click karne se right side ka drawer khulta hai
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleProfileClick = () => setIsProfileOpen(true);

  return (
    <div className="h-[70px] bg-white flex justify-between items-center gap-4 px-4 sm:px-8 border-b border-gray-200">

      {/* Search Box */}
      {/* Grows to 700px but is allowed to shrink, so a narrow window keeps
          the search usable instead of pushing the actions off screen. */}
      <div className="w-full max-w-[700px] min-w-0 h-12 flex items-center px-5 border border-gray-300 rounded-2xl bg-white">

        <FaSearch className="text-gray-400 text-lg" />

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full ml-3 outline-none border-none bg-transparent text-[15px]"
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
      <div className="flex items-center gap-7">
        {/* Notification */}
        <div className="relative cursor-pointer">
          <FaBell className="text-xl text-gray-600" />

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
            className="cursor-pointer text-gray-600 transition-colors hover:text-blue-600"
          >
            <FaCog className="text-xl" />
          </button>
        )}
        {/* Profile */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={handleProfileClick}>

          <div
            className="w-11 h-11 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center">
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