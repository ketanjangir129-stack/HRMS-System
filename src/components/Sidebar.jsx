import "../styles/Sidebar.css";
import {MdDashboard} from "react-icons/md";
function Sidebar() {
    return (
        <div className="sidebar">
            <div className="logo">
                <h2>HRMS</h2>
            </div>

            <ul className="sidebar-menu">
                <li className="active">
                    <MdDashboard className="icon" />
                    <span>Dashboard</span>
                </li>

            </ul>
        </div>
    );
}

export default Sidebar;