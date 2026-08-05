import {Routes,Route} from "react-router-dom";
import Register from "../pages/authenticate/Register";
import Login from "../pages/authenticate/login";
import ChangePassword from "../pages/authenticate/ChangePassword";
import DashboardLayout from "../layouts/DashboardLayout";
import Dashboard from "../pages/Dashboard";
import Departments from "../pages/Departments";
import Employees from "../pages/Employees";
import EmployeeForm from "../pages/EmployeeForm";
import ProtectedRoute from "./ProtectedRoute";
import GuestRoute from "./GuestRoute";
import EmployeesDetails from "../pages/EmployeesDetails";
import OnboardingDashboard from "../pages/onboarding/OnboardingDashboard"
import OnBoardForm from "../pages/onboarding/CreateOnboarding"
import OnboardingRequests from "../pages/onboarding/OnboardingRequests"
import Onboardinghistory from "../pages/onboarding/OnBoardhistory"
import ReviewOnboarding from "../pages/onboarding/ReviewOnboarding"
import AttendanceDashboard from "../pages/attendance/AttendanceDashboard";
import DailyAttendance from "../pages/attendance/DailyAttendance";
import MonthlyAttendance from "../pages/attendance/MonthlyAttendance";
import AttendanceRequests from "../pages/attendance/AttendanceRequests";
import Regularization from "../pages/attendance/Regularization";
import AttendanceReports from "../pages/attendance/AttendanceReports";
import AttendanceSettings from "../pages/attendance/AttendanceSettings";
import EmployeeOnboarding from "../pages/onboarding/EmployeeOnboarding/EmployeeOnboarding";
import SalaryDashboard from "../pages/salary/SalaryDashBoard"
import SalaryCRUD from "../pages/salary/SalaryCRUD"
import SalaryForm from "../pages/salary/SalaryForm"
import SalaryHistory from "../pages/salary/SalaryHistory"
function AppRoutes(){
    return(
        <Routes>
            <Route 
                path = "/" 
                element={
                    <GuestRoute>
                        <Register />
                    </GuestRoute>
                }  
            />
            <Route 
                path = "/login" 
                element={
                    <GuestRoute>
                        <Login />
                    </GuestRoute>
                }  
            />

            <Route 
                element={
                    <ProtectedRoute>
                        <DashboardLayout /> 
                    </ProtectedRoute>
                } 
            >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/departments" element={<Departments />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/employees/add" element={<EmployeeForm />} />
                <Route path="/employees/details/:id" element={<EmployeesDetails />}/>
                <Route path="/OnboardDashboard" element={<OnboardingDashboard />}/>
                <Route path="/OnboardDashboard/OnBoardForm" element={<OnBoardForm />}/>
                <Route path="/OnboardDashboard/OnBoardRequest" element={<OnboardingRequests />}/>
                <Route path="/OnboardDashboard/OnBoardhistory" element={<Onboardinghistory />}/>
                <Route path="/onboarding/:requestId" element={<ReviewOnboarding />}/>

                {/* Attendance Routing */}
                <Route path="/attendance" element={<AttendanceDashboard />} />
                <Route path="/attendance/daily" element={<DailyAttendance />} />
                <Route path="/attendance/monthly" element={<MonthlyAttendance />} />
                <Route path="/attendance/requests" element={<AttendanceRequests />} />
                <Route path="/attendance/regularization" element={<Regularization />} />
                <Route path="/attendance/reports" element={<AttendanceReports />} />
                <Route path="/attendance/settings" element={<AttendanceSettings />} />

                {/* Salary Routing */}
                <Route path="/salarydashboard" element={<SalaryDashboard />} />
                <Route path="/salarydashboard/salary" element={<SalaryCRUD />} />
                <Route path="/salarydashboard/salary/history/:employeeId" element={<SalaryHistory />} />
                <Route path="/salarydashboard/salary/create/:employeeId" element={<SalaryForm />} />
                <Route path="/salarydashboard/salary/edit/:employeeId" element={<SalaryForm />} />
                
                
            </Route>
            
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/onboarding/:companyCode/:employeeId" element={<EmployeeOnboarding />}/>

        </Routes>

    )
}
export default AppRoutes;