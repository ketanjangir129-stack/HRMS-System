import {Routes,Route} from "react-router-dom";
import Register from "../pages/authenticate/Register";
import Login from "../pages/authenticate/login";
import Dashboard from "../layouts/Dashboard"


function AppRoutes(){
    return(
        <Routes>
            <Route path = "/" element={<Register />}  />
            <Route path = "/login" element={<Login />}  />
            <Route path = "/dashboard" element={<Dashboard />}  />

        </Routes>

    )
}
export default AppRoutes;