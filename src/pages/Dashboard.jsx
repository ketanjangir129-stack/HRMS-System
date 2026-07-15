import "../styles/Dashboard.css";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

function Dashboard() {
    return (
        <div className="dashboard-layout">
            <Sidebar />

            <div className="main-content">
                <Navbar />

                <div className="dashboard-content">
                </div>
            </div>
        </div>

    );
}

export default Dashboard;