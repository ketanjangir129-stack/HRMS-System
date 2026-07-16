import { MdDashboard } from "react-icons/md";
import { FaUserTie } from "react-icons/fa";
import { Link } from "react-router-dom";

function Sidebar() {
  return (
    <div className="w-[280px] h-screen bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="h-[95px] flex items-center justify-center border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">
          HRMS
        </h2>
      </div>

      {/* Menu */}
      <ul className="list-none p-5 space-y-2">

      <Link to="/">
        {/* <ul className="list-none p-5"> */}
        <li className="flex items-center gap-4 h-[52px] px-[18px] rounded-xl text-gray-600 cursor-pointer transition-all duration-300 hover:bg-gray-100 bg-gray-100 text-gray-900 font-semibold">
          <MdDashboard className="text-lg" />
          <span>Dashboard</span>
        </li>
        {/* </ul> */}
      </Link>

      <Link to="/employee">
        <li className="flex items-center gap-4 h-[52px] px-[18px] rounded-xl text-gray-600 cursor-pointer transition-all duration-300 hover:bg-gray-100 mt-2">
          <FaUserTie className="text-lg" />
          <span>Employees</span>
        </li>
      </Link>
      </ul>
    </div>
  );
}

export default Sidebar;