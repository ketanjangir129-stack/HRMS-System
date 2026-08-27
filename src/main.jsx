import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { RoleAccessProvider } from "./context/RoleAccessContext";
import { ManagerScopeProvider } from "./context/ManagerScopeContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BrowserRouter } from 'react-router-dom';

/*
| Role access sits inside authentication because it is loaded for the signed
| in user's company, and outside the router because the sidebar, the guards
| and the pages all read the same configuration.
|
| Manager scope sits inside role access and answers the other half of the
| question: role access decides which screens a role may open, manager scope
| decides whose rows are on them. It is a separate provider rather than a
| branch of the first because the two are read from different places, change
| for different reasons, and only one of them is loaded at all for the roles
| that are never narrowed.
|
| Theme sits outside both: it is a device preference rather than a company
| one, and the login screen is painted before there is a user to have it.
*/

ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <AuthProvider>
      <RoleAccessProvider>
        <ManagerScopeProvider>
          <BrowserRouter>
            <App />
            <ToastContainer position="bottom-right" />
          </BrowserRouter>
        </ManagerScopeProvider>
      </RoleAccessProvider>
    </AuthProvider>
  </ThemeProvider>
);
