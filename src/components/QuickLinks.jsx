function QuickLinks(){
    return(
        <>
            <div className="welcome-section" >
                <div>
                    <p className="date" >Wednesday, July 15, 2026</p>

                    <h1>Hello, Admin</h1>

                    <p className="welcome-text">Here's what's happening with your HRMS today.</p>

                </div>
            </div>

            
            <div className="dashboard-row">

                {/* Today's Tasks */}
                <div className="task-card">

                    <div className="card-title">
                        <h2>Today's Tasks</h2>
                        <button>View All</button>
                    </div>

                    <div className="task-item">
                        <input type="checkbox" />
                        <span>Complete employee onboarding process</span>
                    </div>

                    <div className="task-item">
                        <input type="checkbox" />
                        <span>Review leave requests</span>
                    </div>


                    <div className="task-item">
                        <input type="checkbox" />
                        <span>Prepare monthly payroll report</span>
                    </div>

                    <div className="task-item">
                        <input type="checkbox" />
                        <span>Conduct performance evaluations</span>
                    </div>

                </div>

                {/* Quick find */}
                <div className="quick-card">
                    <h2>Quick Find</h2>
                    
                    <div className="quick-grid">

                        <div className="quick-item">
                            <FaUserTie className="quick-icon blue" />
                            <p>Employees</p>
                    </div>

                        <div className="quick-item">
                            <FaCog className="quick-icon green" />
                            <p>Settings</p>
                        </div>

                        <div className="quick-item">
                            <FaGlobe className="quick-icon orange" />
                            <p>Departments</p>
                        </div>


                        <div className="quick-item">
                            <FaGraduationCap className="quick-icon red" />
                            <p>Training</p>
                        </div>

                        <div className="quick-item">
                            <FaChartBar className="quick-icon teal" />
                            <p>Reports</p>
                        </div>

                        <div className="quick-item">
                            <FaImage className="quick-icon pink" />
                            <p>Media</p>
                        </div>

                        <div className="quick-item">
                            <FaBuilding className="quick-icon brown" />
                            <p>Offices</p>
                        </div>

                        <div className="quick-item">
                            <FaShieldAlt className="quick-icon gray" />
                            <p>Security</p>
                            </div>

                        </div>
                </div>

            </div>
        </>
    )
}
export default QuickLinks;