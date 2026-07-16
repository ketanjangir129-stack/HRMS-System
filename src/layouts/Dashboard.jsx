import "../styles/Dashboard.css";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import {
    FaUserTie,
    FaCog,
    FaGlobe,
    FaGraduationCap,    
    FaChartBar,
    FaImage,
    FaBuilding,
    FaShieldAlt,
} from "react-icons/fa";
import { Outlet } from "react-router-dom";


function Dashboard() {
    return (
        <div className="dashboard-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar />
                <main className="dashboard-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default Dashboard;