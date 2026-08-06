import { MdDashboard, MdOutlineBeachAccess, MdOutlineCelebration } from "react-icons/md";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import { FaBuilding, FaTasks } from "react-icons/fa";
import { BsFillPersonLinesFill,BsCalendarCheck } from "react-icons/bs";
import { PiPersonSimpleSnowboardLight } from "react-icons/pi";
import { GiTakeMyMoney } from "react-icons/gi";
import { NavLink } from "react-router-dom";
import {BadgeIndianRupee} from "lucide-react"

const menuItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: MdDashboard,
  },
  {
    label: "Departments",
    path: "/departments",
    icon: FaBuilding,
  },
  
  {
    label: "Employees",
    path: "/employees",
    icon: BsFillPersonLinesFill,
  },

  {
    label: "On-boarding",
    path: "/OnboardDashboard",
    icon: PiPersonSimpleSnowboardLight,
  },
  {
    label: "Attendance",
    path: "/attendance",
    icon: BsCalendarCheck,
  },
  {
    label: "Leave",
    path: "/leave",
    icon: MdOutlineBeachAccess,
  },
  {
    label: "Holidays",
    path: "/holidays",
    icon: MdOutlineCelebration,
  },
  {
    label: "Salary",
    path: "/salarydashboard",
    icon: GiTakeMyMoney,
  },
   {
    label: "Payroll Management",
    path: "/payrolldashboard",
    icon: BadgeIndianRupee ,
  },
  {
    label: "Tasks",
    path: "/tasks",
    icon: FaTasks,
  },
];

function Sidebar({ isCollapsed, onToggle }) {
  return (
    <aside
      className={`h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-[88px]" : "w-[280px]"
      }`}
    >

      {/* Logo */}
      <div className={`h-[95px] shrink-0 border-b border-gray-200 flex items-center ${isCollapsed ? "justify-center px-3" : "justify-between px-6"}`}>

          <div className="flex items-center gap-3 overflow-hidden">

              <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-sm">
                  <span className="text-white text-xl font-bold">
                      H
                  </span>
              </div>

              <div className={`whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? "hidden" : "block"}`}>
                  <h2 className="text-lg font-bold text-slate-900 leading-none">
                      HRMS
                  </h2>

                  <p className="text-xs text-slate-500 mt-1">
                      Workforce Management
                  </p>
              </div>

          </div>

      </div>

      {/* Navigation */}
      {/*
        The menu is the only part that scrolls: the logo and the collapse
        button stay put while the links move under them.

        `min-h-0` is what makes that work. A flex child defaults to
        `min-height: auto`, which refuses to shrink below its content, so
        without it the nav would push the collapse button off screen instead
        of scrolling.
      */}
      <nav className={`flex-1 min-h-0 overflow-y-auto hide-scrollbar ${isCollapsed ? "p-3 pt-5" : "p-5"}`}>
        <ul className="space-y-2">

          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center h-[52px] rounded-xl transition-all duration-200 font-semibold
                      ${isCollapsed ? "justify-center px-2" : "gap-4 px-[18px]"}
                      ${isActive ? "bg-gray-100 text-gray-900 "
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon className="text-lg flex-shrink-0" size={20} />
                  {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                </NavLink>
              </li>
            );
          })}

        </ul>
      </nav>

      <div className={`shrink-0 border-t border-gray-200 p-4 ${isCollapsed ? "flex justify-center" : ""}`}>
        <button
          type="button"
          onClick={onToggle}
          className={`flex h-11 cursor-pointer items-center rounded-xl text-slate-500 transition-colors hover:bg-gray-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isCollapsed ? "w-11 justify-center" : "w-full justify-between px-4"
          }`}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {!isCollapsed && <span className="text-sm font-semibold">Collapse sidebar</span>}
          {isCollapsed ? <MdChevronRight size={22} /> : <MdChevronLeft size={22} />}
        </button>
      </div>

    </aside>
  );
}

export default Sidebar;
