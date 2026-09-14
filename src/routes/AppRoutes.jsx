import { Routes, Route, Navigate } from "react-router-dom";
import Register from "../pages/authenticate/Register";
import Login from "../pages/authenticate/login";
import ChangePassword from "../pages/authenticate/ChangePassword";
import DashboardLayout from "../layouts/DashboardLayout";
import Dashboard from "../pages/Dashboard";
import Departments from "../pages/Departments";
import DepartmentImport from "../pages/DepartmentImport";
import Employees from "../pages/Employees";
import EmployeeForm from "../pages/EmployeeForm";
import ProtectedRoute from "./ProtectedRoute";
import PermissionRoute from "./PermissionRoute";
import GuestRoute from "./GuestRoute";
import EmployeesDetails from "../pages/EmployeesDetails";
import OnboardingDashboard from "../pages/onboarding/OnboardingDashboard"
import BulkOnboarding from "../pages/onboarding/BulkOnboarding"
import OnBoardForm from "../pages/onboarding/CreateOnboarding"
import OnboardingRequests from "../pages/onboarding/OnboardingRequests"
import Onboardinghistory from "../pages/onboarding/OnBoardhistory"
import ReviewOnboarding from "../pages/onboarding/ReviewOnboarding"
import AttendanceDashboard from "../pages/attendance/AttendanceDashboard";
import DailyAttendance from "../pages/attendance/DailyAttendance";
import MonthlyAttendance from "../pages/attendance/MonthlyAttendance";
import MyAttendance from "../pages/attendance/MyAttendance";
import AttendanceRequests from "../pages/attendance/AttendanceRequests";
import AttendanceApprovals from "../pages/attendance/AttendanceApprovals";
import Regularization from "../pages/attendance/Regularization";
import AttendanceReports from "../pages/attendance/AttendanceReports";
import AttendanceImport from "../pages/attendance/AttendanceImport";
import AttendanceSettings from "../pages/attendance/AttendanceSettings";
import AttendanceLocation from "../pages/attendance/AttendanceLocation";
import LeaveDashboard from "../pages/leave/LeaveDashboard";
import LeaveApprovals from "../pages/leave/LeaveApprovals";
import HolidayDashboard from "../pages/holiday/HolidayDashboard";
import EmployeeOnboarding from "../pages/onboarding/EmployeeOnboarding/EmployeeOnboarding";
import SalaryCRUD from "../pages/salary/SalaryCRUD";
import SalaryForm from "../pages/salary/SalaryForm";
import SalaryImport from "../pages/salary/SalaryImport";
import SalaryHistory from "../pages/salary/SalaryHistory";
import PayrolllDashboard from "../pages/payroll/PayrollDashboard";
import PaySlip from "../pages/payroll/PaySlip";
import MyPayroll from "../pages/payroll/MyPayroll";
import HRPolicy from "../pages/hrPolicy/HRPolicy";
import AllTasks from "../pages/tasks/AllTasks";
import Settings from "../pages/settings/Settings";
import Profile from "../pages/Profile";

/*
| Every page inside the dashboard is mounted behind `PermissionRoute` with the
| permission it answers to, so a page cannot be reached by typing its address
| even when the sidebar has stopped offering it. The permission strings are
| the ones declared in the permission registry.
|
| `/change-password`, `/reset-password` and the public on-boarding link stay
| unguarded: none is a company page, and all are reached before a role means
| anything. The reset link carries its own proof in the address, which is why
| it can be opened by somebody with no session at all.
*/

function AppRoutes() {
    return (
        <Routes>
            <Route
                path="/"
                element={
                    <GuestRoute>
                        <Register />
                    </GuestRoute>
                }
            />
            <Route
                path="/login"
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

                {/*
                  Importing a company's organisation chart. Guarded by its own
                  permission, which is off by default for every managed role:
                  it is the only screen that creates departments in bulk.
                */}
                <Route
                    path="/departments/import"
                    element={
                        <PermissionRoute permission="departments.import">
                            <DepartmentImport />
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
                    path="/OnboardDashboard/BulkOnboard"
                    element={
                        <PermissionRoute permission="onboarding.create">
                            <BulkOnboarding />
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
                    path="/onboarding/:requestId" hr po
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

                {/*
                  The approval desk. Guarded by its own permission rather than
                  by `attendance.daily`: reading a day and deciding it are two
                  different rights, and the page also re-asks the department
                  scope before it writes anything.
                */}
                <Route
                    path="/attendance/approvals"
                    element={
                        <PermissionRoute permission="attendance.approvals">
                            <AttendanceApprovals />
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

                {/*
                  Importing a company's attendance history. Guarded by its own
                  permission, which is off by default for every managed role:
                  it is the only attendance screen that creates months of
                  records in one action.
                */}
                <Route
                    path="/attendance/import"
                    element={
                        <PermissionRoute permission="attendance.import">
                            <AttendanceImport />
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

                <Route
                    path="/attendance/location/:date/:employeeId"
                    element={
                        <PermissionRoute permission="attendance">
                            <AttendanceLocation />
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

                {/*
                  Salary Routing

                  One screen for the module, reached from the sidebar. The
                  register and the revision history are tabs on it rather than
                  pages of their own, so the two addresses they used to have
                  are kept only to carry an old link onto the right tab.
                */}
                <Route
                    path="/salarydashboard"
                    element={
                        <PermissionRoute permission="salary">
                            <SalaryCRUD />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/salarydashboard/salary"
                    element={<Navigate to="/salarydashboard" replace />}
                />

                <Route
                    path="/salarydashboard/salary/revisions"
                    element={
                        <Navigate to="/salarydashboard?tab=revisions" replace />
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
                {/*
                  Bulk assignment, behind the same right as assigning one:
                  importing a file is the same act as filling the form in, and
                  the screen refuses to revise an existing structure unless the
                  update right is held as well.
                */}
                <Route
                    path="/salarydashboard/salary/import"
                    element={
                        <PermissionRoute permission="salary.create">
                            <SalaryImport />
                        </PermissionRoute>
                    }
                />

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

                {/*
                  My Payroll - the employee's own salary, behind its own
                  permission rather than the payroll one. Holding that page
                  would hand them the whole company's pay.

                  Its payslip route carries no employee id. The id is the
                  signed in user's, so taking one from the address would be an
                  invitation to read somebody else's by editing the URL.
                */}
                <Route
                    path="/my-payroll"
                    element={
                        <PermissionRoute permission="myPayroll">
                            <MyPayroll />
                        </PermissionRoute>
                    }
                />

                <Route
                    path="/my-payroll/payslip"
                    element={
                        <PermissionRoute permission="myPayroll.payslip">
                            <PaySlip />
                        </PermissionRoute>
                    }
                />

                {/* HR Policy - the PF and ESI rules payslips are priced against */}
                <Route
                    path="/hr-policy"
                    element={
                        <PermissionRoute permission="hrPolicy">
                            <HRPolicy />
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

                {/*
                  Profile - the user's own record, so it carries no permission.
                  It is not `employees.details`: that is the HR view of somebody
                  else, and a role without it must still be able to open its own.
                */}
                <Route path="/profile" element={<Profile />} />

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

            {/*
              The two reset links, both answered by the screen above it.
              `ChangePassword` reads the address to know which it is, and drops
              its current-password field for either - not having that password
              is why the link exists.

              The first carries our own token, for an employee. The second
              carries none: Firebase puts an `oobCode` in the query string when
              its action URL is pointed here, which is how the owner lands on
              this page rather than on one of Google's.

              Unguarded, like the on-boarding form beneath them and for the same
              reason: whoever opens one has no session, and the link is what
              stands in for it.
            */}
            <Route
                path="/reset-password/:companyCode/:employeeId/:token"
                element={<ChangePassword />}
            />

            <Route path="/reset-password" element={<ChangePassword />} />

            <Route path="/onboarding/:companyCode/:employeeId" element={<EmployeeOnboarding />} />

        </Routes>

    )
}
export default AppRoutes;
