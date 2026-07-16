import {Routes,Route} from "react-router-dom";
import Register from "../pages/authenticate/Register";
import Login from "../pages/authenticate/login";


function AppRoutes(){
    return(
        <Routes>
            <Route path = "/" element={<Register/ >}  />
            <Route path = "/login" element={<Login />}  />

        </Routes>

    )
}
export default AppRoutes;