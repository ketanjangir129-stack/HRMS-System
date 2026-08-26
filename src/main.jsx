import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { RoleAccessProvider } from "./context/RoleAccessContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BrowserRouter } from 'react-router-dom';

/*
| Role access sits inside authentication because it is loaded for the signed
| in user's company, and outside the router because the sidebar, the guards
| and the pages all read the same configuration.
|
| Theme is a device preference rather than a company one, so it does not need
| a company - but it does need to know whether anybody is signed in, because
| the toggle that controls it lives in the navbar and the navbar only exists
| behind a login. Hence inside authentication and outside role access.
*/

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <ThemeProvider>
      <RoleAccessProvider>
        <BrowserRouter>
          <App />
          <ToastContainer position="bottom-right" />
        </BrowserRouter>
      </RoleAccessProvider>
    </ThemeProvider>
  </AuthProvider>
);
