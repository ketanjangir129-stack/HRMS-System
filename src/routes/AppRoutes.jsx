import {Routes,Route} from "react-router-dom";
import Register from "../pages/authenticate/Register";
import Login from "../pages/authenticate/login";
import DashboardLayout from "../layouts/DashboardLayout";
import Dashboard from "../pages/Dashboard";
import Departments from "../pages/Departments";
import Employees from "../pages/Employees";
import EmployeeForm from "../pages/EmployeeForm";
import ProtectedRoute from "./ProtectedRoute";
import GuestRoute from "./GuestRoute";
import EmployeesDetails from "../pages/EmployeesDetails";
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
            </Route>

        </Routes>

    )
}
export default AppRoutes;