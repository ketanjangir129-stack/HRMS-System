import {
  FaSearch,
  FaBell,
  FaCog,
  FaChevronDown,
  FaTimes
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { AiOutlineLogout } from "react-icons/ai";
import useAuth from "../hooks/useAuth";
import { toast } from "react-toastify";

const Navbar = ({search,setSearch,searchPlaceholder}) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
    toast.success("Logged Out Successfully");
  };
  return (
    <div className="h-[70px] bg-white flex justify-between items-center px-8 border-b border-gray-200">

      {/* Search Box */}
      <div className="w-[700px] h-12 flex items-center px-5 border border-gray-300 rounded-2xl bg-white">

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
        <div className="relative cursor-pointer" onClick={handleLogout}>
          <AiOutlineLogout className="text-2xl text-red-600" />
        </div>
        {/* Notification */}
        <div className="relative cursor-pointer">
          <FaBell className="text-xl text-gray-600" />

          <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center">
            3
          </span>
        </div>
        {/* Settings */}
        <FaCog className="text-xl text-gray-600 cursor-pointer" />

        {/* Profile */}
        <div className="flex items-center gap-3 cursor-pointer">

          <div className="w-11 h-11 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center">
            A
          </div>

          <FaChevronDown className="text-gray-500" />

        </div>
      </div>

    </div>
  );
}

export default Navbar;