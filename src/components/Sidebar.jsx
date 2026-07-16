import { MdDashboard } from "react-icons/md";
import { FaBuilding } from "react-icons/fa";
import { NavLink } from "react-router-dom";

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
];

function Sidebar() {
  return (
    <aside className="w-[280px] h-screen bg-white border-r border-gray-200 flex flex-col">

      {/* Logo */}
      <div className="h-[95px] px-6 border-b border-gray-200 flex items-center">

          <div className="flex items-center gap-3">

              <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-sm">
                  <span className="text-white text-xl font-bold">
                      H
                  </span>
              </div>

              <div>
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
      <nav className="flex-1 p-5">
        <ul className="space-y-2">

          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-4 h-[52px] px-[18px] rounded-xl transition-all duration-200 font-semibold
                      ${isActive ? "bg-gray-100 text-gray-900 "
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon className="text-lg flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}

        </ul>
      </nav>

    </aside>
  );
}

export default Sidebar;