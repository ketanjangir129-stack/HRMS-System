import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Register from "../pages/authenticate/Register";
import Login from "../pages/authenticate/login";
import ChangePassword from "../pages/authenticate/ChangePassword";
import DashboardLayout from "../layouts/DashboardLayout";
import ProtectedRoute from "./ProtectedRoute";
import PermissionRoute from "./PermissionRoute";
import GuestRoute from "./GuestRoute";
import Loader from "../components/common/Loader";
import RouteErrorBoundary from "../components/common/RouteErrorBoundary";

/*
|--------------------------------------------------------------------------
| Route Splitting
|--------------------------------------------------------------------------
| Every page below is fetched the first time its route is opened rather than
| being built into the one file the browser downloads before it can show
| anything.
|
| Importing them all at the top meant every user carried every screen. The
| cost was not the pages themselves but what they pull in behind them: `xlsx`
| sits behind the four import screens and the salary export, `leaflet` behind
| the attendance map, and none of them is reachable from anywhere else - so
| the bundler now files each one with the routes that actually use it. An
| employee who only ever punches in stops paying for the payroll module, the
| spreadsheet parser and the mapping library.
|
| What stays eager is what is needed before any route is chosen: the two
| sign-in screens, the dashboard shell the pages are drawn inside, and the
| three guards that decide which of them may be reached. Splitting those
| would only add a round trip in front of the first paint.
|
| The pages are unchanged. `lazy` needs a default export and each of them
| already had one.
*/

const ResetPassword = lazy(() => import("../pages/authenticate/ResetPassword"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Departments = lazy(() => import("../pages/departments/Departments"));
const DepartmentImport = lazy(() => import("../pages/departments/DepartmentImport"));
const Employees = lazy(() => import("../pages/Employees"));
const EmployeeForm = lazy(() => import("../pages/EmployeeForm"));
const EmployeesDetails = lazy(() => import("../pages/EmployeesDetails"));
const OnboardingDashboard = lazy(() => import("../pages/onboarding/OnboardingDashboard"));
const BulkOnboarding = lazy(() => import("../pages/onboarding/BulkOnboarding"));
const OnBoardForm = lazy(() => import("../pages/onboarding/CreateOnboarding"));
const OnboardingRequests = lazy(() => import("../pages/onboarding/OnboardingRequests"));
const Onboardinghistory = lazy(() => import("../pages/onboarding/OnBoardhistory"));
const ReviewOnboarding = lazy(() => import("../pages/onboarding/ReviewOnboarding"));
const AttendanceDashboard = lazy(() => import("../pages/attendance/AttendanceDashboard"));
const DailyAttendance = lazy(() => import("../pages/attendance/DailyAttendance"));
const MonthlyAttendance = lazy(() => import("../pages/attendance/MonthlyAttendance"));
const MyAttendance = lazy(() => import("../pages/attendance/MyAttendance"));
const AttendanceRequests = lazy(() => import("../pages/attendance/AttendanceRequests"));
const AttendanceApprovals = lazy(() => import("../pages/attendance/AttendanceApprovals"));
const Regularization = lazy(() => import("../pages/attendance/Regularization"));
const AttendanceReports = lazy(() => import("../pages/attendance/AttendanceReports"));
const AttendanceImport = lazy(() => import("../pages/attendance/AttendanceImport"));
const AttendanceSettings = lazy(() => import("../pages/attendance/AttendanceSettings"));
const AttendanceLocation = lazy(() => import("../pages/attendance/AttendanceLocation"));
const LeaveDashboard = lazy(() => import("../pages/leave/LeaveDashboard"));
const LeaveApprovals = lazy(() => import("../pages/leave/LeaveApprovals"));
const HolidayDashboard = lazy(() => import("../pages/holiday/HolidayDashboard"));
const EmployeeOnboarding = lazy(() => import("../pages/onboarding/EmployeeOnboarding/EmployeeOnboarding"));
const SalaryCRUD = lazy(() => import("../pages/salary/SalaryCRUD"));
const SalaryForm = lazy(() => import("../pages/salary/SalaryForm"));
const SalaryImport = lazy(() => import("../pages/salary/SalaryImport"));
const SalaryHistory = lazy(() => import("../pages/salary/SalaryHistory"));
const PayrolllDashboard = lazy(() => import("../pages/payroll/PayrollDashboard"));
const PaySlip = lazy(() => import("../pages/payroll/PaySlip"));
const MyPayroll = lazy(() => import("../pages/payroll/MyPayroll"));
const HRPolicy = lazy(() => import("../pages/hrPolicy/HRPolicy"));
const AllTasks = lazy(() => import("../pages/tasks/AllTasks"));
const Settings = lazy(() => import("../pages/settings/Settings"));
const Profile = lazy(() => import("../pages/Profile"));

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
        /*
        | `Suspense` is the boundary a split page suspends against while its
        | chunk is on the way. `Loader` is the same spinner the pages already
        | show while they are fetching their own data, so a page that has to be
        | downloaded first looks like a page that is loading - which is what it
        | is.
        |
        | `RouteErrorBoundary` sits outside it for the case where the chunk
        | never arrives. Suspense waits; it has no opinion about a fetch that
        | failed, and without something to catch that the screen goes blank.
        */
        <RouteErrorBoundary>
        <Suspense fallback={<Loader />}>
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
              The reset link from a forgotten-password email. Unguarded like
              the on-boarding form beneath it and for the same reason: whoever
              opens it has no session, and the link itself is what stands in
              for one. The page checks it before showing anything.
            */}
            <Route
                path="/reset-password/:companyCode/:employeeId/:token"
                element={<ResetPassword />}
            />

            <Route path="/onboarding/:companyCode/:employeeId" element={<EmployeeOnboarding />} />

        </Routes>
        </Suspense>
        </RouteErrorBoundary>

    )
}
export default AppRoutes;
