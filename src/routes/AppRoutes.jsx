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
import PermissionRoute from "./PermissionRoute";
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
import MyAttendance from "../pages/attendance/MyAttendance";
import AttendanceRequests from "../pages/attendance/AttendanceRequests";
import Regularization from "../pages/attendance/Regularization";
import AttendanceReports from "../pages/attendance/AttendanceReports";
import AttendanceSettings from "../pages/attendance/AttendanceSettings";
import LeaveDashboard from "../pages/leave/LeaveDashboard";
import LeaveApprovals from "../pages/leave/LeaveApprovals";
import HolidayDashboard from "../pages/holiday/HolidayDashboard";
import EmployeeOnboarding from "../pages/onboarding/EmployeeOnboarding/EmployeeOnboarding";
import SalaryDashboard from "../pages/salary/SalaryDashBoard";
import SalaryCRUD from "../pages/salary/SalaryCRUD";
import SalaryForm from "../pages/salary/SalaryForm";
import SalaryHistory from "../pages/salary/SalaryHistory";
import SalaryRevisions from "../pages/salary/SalaryRevisions";
import PayrolllDashboard from "../pages/payroll/PayrollDashboard";
import PaySlip from "../pages/payroll/PaySlip";
import AllTasks from "../pages/tasks/AllTasks";
import Settings from "../pages/settings/Settings";

/*
| Every page inside the dashboard is mounted behind `PermissionRoute` with the
| permission it answers to, so a page cannot be reached by typing its address
| even when the sidebar has stopped offering it. The permission strings are
| the ones declared in the permission registry.
|
| `/change-password` and the public on-boarding link stay unguarded: neither
| is a company page, and both are reached before a role means anything.
*/

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
                <Route
                    path="/dashboard"
                    element={
                        <PermissionRoute permission="dashboard">
                            <Dashboard />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/departments"
                    element={
                        <PermissionRoute permission="departments">
                            <Departments />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/employees"
                    element={
                        <PermissionRoute permission="employees">
                            <Employees />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/employees/add"
                    element={
                        <PermissionRoute permission="employees.add">
                            <EmployeeForm />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/employees/details/:id"
                    element={
                        <PermissionRoute permission="employees.details">
                            <EmployeesDetails />
                        </PermissionRoute>
                    }
                />

                {/* On-boarding Routing */}
                <Route
                    path="/OnboardDashboard"
                    element={
                        <PermissionRoute permission="onboarding">
                            <OnboardingDashboard />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/OnboardDashboard/OnBoardForm"
                    element={
                        <PermissionRoute permission="onboarding.create">
                            <OnBoardForm />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/OnboardDashboard/OnBoardRequest"
                    element={
                        <PermissionRoute permission="onboarding.requests">
                            <OnboardingRequests />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/OnboardDashboard/OnBoardhistory"
                    element={
                        <PermissionRoute permission="onboarding.history">
                            <Onboardinghistory />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/onboarding/:requestId"
                    element={
                        <PermissionRoute permission="onboarding.requests">
                            <ReviewOnboarding />
                        </PermissionRoute>
                    }
                />

                {/* Attendance Routing */}
                <Route
                    path="/attendance"
                    element={
                        <PermissionRoute permission="attendance">
                            <AttendanceDashboard />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/attendance/daily"
                    element={
                        <PermissionRoute permission="attendance.daily">
                            <DailyAttendance />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/attendance/my"
                    element={
                        <PermissionRoute permission="attendance.myAttendance">
                            <MyAttendance />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/attendance/monthly"
                    element={
                        <PermissionRoute permission="attendance.monthly">
                            <MonthlyAttendance />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/attendance/requests"
                    element={
                        <PermissionRoute permission="attendance.requests">
                            <AttendanceRequests />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/attendance/regularization"
                    element={
                        <PermissionRoute permission="attendance.regularization">
                            <Regularization />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/attendance/reports"
                    element={
                        <PermissionRoute permission="attendance.reports">
                            <AttendanceReports />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/attendance/settings"
                    element={
                        <PermissionRoute permission="attendance.settings">
                            <AttendanceSettings />
                        </PermissionRoute>
                    }
                />

                {/* Leave Management Routing */}
                <Route
                    path="/leave"
                    element={
                        <PermissionRoute permission="leave">
                            <LeaveDashboard />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/leave/approvals"
                    element={
                        <PermissionRoute permission="leave.approvals">
                            <LeaveApprovals />
                        </PermissionRoute>
                    }
                />

                {/* Holiday Management Routing */}
                <Route
                    path="/holidays"
                    element={
                        <PermissionRoute permission="holidays">
                            <HolidayDashboard />
                        </PermissionRoute>
                    }
                />

                {/* Salary Routing */}
                <Route
                    path="/salarydashboard"
                    element={
                        <PermissionRoute permission="salary">
                            <SalaryDashboard />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/salarydashboard/salary"
                    element={
                        <PermissionRoute permission="salary.manage">
                            <SalaryCRUD />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/salarydashboard/salary/revisions"
                    element={
                        <PermissionRoute permission="salary.revisions">
                            <SalaryRevisions />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/salarydashboard/salary/history/:employeeId"
                    element={
                        <PermissionRoute permission="salary.history">
                            <SalaryHistory />
                        </PermissionRoute>
                    }
                />

                {/*
                  One component, two routes, two permissions: assigning a new
                  structure and revising an existing one are separate rights.
                */}
                <Route
                    path="/salarydashboard/salary/create/:employeeId"
                    element={
                        <PermissionRoute permission="salary.create">
                            <SalaryForm />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/salarydashboard/salary/edit/:employeeId"
                    element={
                        <PermissionRoute permission="salary.update">
                            <SalaryForm />
                        </PermissionRoute>
                    }
                />

                {/* payroll Routing */}
                <Route
                    path="/payrolldashboard"
                    element={
                        <PermissionRoute permission="payroll">
                            <PayrolllDashboard />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/payrolldashboard/payslip/:employeeId"
                    element={
                        <PermissionRoute permission="payroll.payslip">
                            <PaySlip />
                        </PermissionRoute>
                    }
                />

                {/* Tasks */}
                <Route
                    path="/tasks"
                    element={
                        <PermissionRoute permission="tasks">
                            <AllTasks />
                        </PermissionRoute>
                    }
                />

                {/* Settings - owner only, and the only way into Roles & Access */}
                <Route
                    path="/settings"
                    element={
                        <PermissionRoute ownerOnly>
                            <Settings />
                        </PermissionRoute>
                    }
                />

            </Route>

            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/onboarding/:companyCode/:employeeId" element={<EmployeeOnboarding />}/>

        </Routes>

    )
}
export default AppRoutes;
