import {Routes,Route} from "react-router-dom";
import Register from "../pages/authenticate/Register";
import Login from "../pages/authenticate/login";
import DashboardLayout from "../layouts/DashboardLayout";
import Dashboard from "../pages/Dashboard";
import Departments from "../pages/Departments";
import Employees from "../pages/Employees";
import EmployeeForm from "../pages/EmployeeForm";

function AppRoutes(){
    return(
        <Routes>
            <Route path = "/" element={<Register />}  />
            <Route path = "/login" element={<Login />}  />
    <Route element={<DashboardLayout /> } >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/departments" element={<Departments />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/employees/add" element={<EmployeeForm />} />
            </Route>

        </Routes>

    )
}
export default AppRoutes;