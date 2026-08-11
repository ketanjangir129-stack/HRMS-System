import { MdDashboard, MdOutlineBeachAccess, MdOutlineCelebration } from "react-icons/md";
import { MdChevronLeft, MdChevronRight, MdClose } from "react-icons/md";
import { FaBuilding, FaTasks } from "react-icons/fa";
import { BsFillPersonLinesFill,BsCalendarCheck } from "react-icons/bs";
import { PiPersonSimpleSnowboardLight } from "react-icons/pi";
import { GiTakeMyMoney } from "react-icons/gi";
import { FiSettings } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import {BadgeIndianRupee} from "lucide-react"
import { useMemo } from "react";
import useRoleAccess from "../hooks/useRoleAccess";

/*
| Every item carries the permission it is offered under, so the menu is
| filtered against the company's Roles & Access configuration rather than
| styled away: a link the role cannot open is not in the list at all.
|
| `ownerOnly` is the one exception that is not configurable - Settings is
| where the permissions themselves are edited, so it can only ever belong to
| the owner.
*/

const menuItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: MdDashboard,
    permission: "dashboard",
  },
  {
    label: "Departments",
    path: "/departments",
    icon: FaBuilding,
    permission: "departments",
  },

  {
    label: "Employees",
    path: "/employees",
    icon: BsFillPersonLinesFill,
    permission: "employees",
  },

  {
    label: "On-boarding",
    path: "/OnboardDashboard",
    icon: PiPersonSimpleSnowboardLight,
    permission: "onboarding",
  },
  {
    label: "Attendance",
    path: "/attendance",
    icon: BsCalendarCheck,
    permission: "attendance",
  },
  {
    label: "Leave",
    path: "/leave",
    icon: MdOutlineBeachAccess,
    permission: "leave",
  },
  {
    label: "Holidays",
    path: "/holidays",
    icon: MdOutlineCelebration,
    permission: "holidays",
  },
   {
    label: "Tasks",
    path: "/tasks",
    icon: FaTasks,
    permission: "tasks",
  },
  {
    label: "Salary",
    path: "/salarydashboard",
    icon: GiTakeMyMoney,
    permission: "salary",
  },
   {
    label: "Payroll",
    path: "/payrolldashboard",
    icon: BadgeIndianRupee ,
    permission: "payroll",
  },
  {
    label: "Settings",
    path: "/settings",
    icon: FiSettings,
    ownerOnly: true,
  },
];

/*
| Stand-ins for the links while the configuration is read. Rendering the full
| menu first would show links that are about to disappear, and rendering
| nothing would make the sidebar collapse and jump.
*/

/*
| The collapsed look belongs to the desktop rail only - below `lg` the
| sidebar is a full-width drawer that is either on screen or off it, so every
| collapse-driven class here is `lg:` prefixed and the expanded layout is the
| mobile default.
*/

function SidebarSkeleton({ isCollapsed }) {
  return (
    <ul className="space-y-2">

      {Array.from({ length: 8 }).map((_, index) => (

        <li key={index}>
          <div
            className={`flex h-[52px] items-center gap-4 rounded-xl bg-slate-100 px-[18px] ${
              isCollapsed ? "lg:justify-center lg:gap-0 lg:px-2" : ""
            }`}
          >

            <span className="h-5 w-5 shrink-0 animate-pulse rounded-md bg-slate-200" />

            <span
              className={`h-4 w-28 animate-pulse rounded-md bg-slate-200 ${
                isCollapsed ? "lg:hidden" : ""
              }`}
            />

          </div>
        </li>

      ))}

    </ul>
  );
}

function Sidebar({ isCollapsed, onToggle, isMobileOpen = false, onMobileClose }) {

  const { canAccessPage, isOwner, loading } = useRoleAccess();

  const visibleItems = useMemo(
    () =>
      menuItems.filter((item) =>
        item.ownerOnly ? isOwner : canAccessPage(item.permission)
      ),
    [canAccessPage, isOwner]
  );

  /*
    Two sidebars in one element.

    On `lg` and up it is a normal flex column in the page that only changes
    width. Below that it is taken out of the flow entirely and parked off the
    left edge, so the content column gets the whole viewport, and the list
    button slides it back in.
  */
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[280px] flex-col border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0 lg:transition-all
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        ${isCollapsed ? "lg:w-[88px]" : "lg:w-[280px]"}`}
    >

      {/* Logo */}
      <div className={`h-[95px] shrink-0 border-b border-gray-200 flex items-center justify-between px-6 ${isCollapsed ? "lg:justify-center lg:px-3" : ""}`}>

          <div className="flex items-center gap-3 overflow-hidden">

              <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-sm">
                  <span className="text-white text-xl font-bold">
                      H
                  </span>
              </div>

              <div className={`whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? "lg:hidden" : "block"}`}>
                  <h2 className="text-lg font-bold text-slate-900 leading-none">
                      HRMS
                  </h2>

                  <p className="text-xs text-slate-500 mt-1">
                      Workforce Management
                  </p>
              </div>

          </div>

          {/* The drawer has no visible edge to click past on a phone, so it
              carries its own close button. */}
          <button
            type="button"
            onClick={onMobileClose}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-gray-100 hover:text-slate-900 lg:hidden"
            aria-label="Close menu"
          >
            <MdClose size={22} />
          </button>

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
      <nav className={`flex-1 min-h-0 overflow-y-auto hide-scrollbar p-5 ${isCollapsed ? "lg:p-3 lg:pt-5" : ""}`}>

        {loading ? (

          <SidebarSkeleton isCollapsed={isCollapsed} />

        ) : (

          <ul className="space-y-2">

            {visibleItems.map((item) => {
              const Icon = item.icon;

              return (
                <li key={item.path}>
                  {/* Tapping a link on a phone means the drawer has done its
                      job - it closes with the navigation. */}
                  <NavLink
                    to={item.path}
                    onClick={onMobileClose}
                    className={({ isActive }) =>
                      `flex items-center h-[52px] rounded-xl transition-all duration-200 font-semibold gap-4 px-[18px]
                        ${isCollapsed ? "lg:justify-center lg:gap-0 lg:px-2" : ""}
                        ${isActive ? "bg-gray-100 text-gray-900 "
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className="text-lg flex-shrink-0" size={20} />
                    <span className={`whitespace-nowrap ${isCollapsed ? "lg:hidden" : ""}`}>
                      {item.label}
                    </span>
                  </NavLink>
                </li>
              );
            })}

          </ul>

        )}

      </nav>

      {/* Collapsing is a desktop affordance - the drawer is either open or
          gone, so there is no half state to offer on a phone. */}
      <div className={`hidden shrink-0 border-t border-gray-200 p-4 lg:block ${isCollapsed ? "lg:flex lg:justify-center" : ""}`}>
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
