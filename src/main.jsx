import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { RoleAccessProvider } from "./context/RoleAccessContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BrowserRouter } from 'react-router-dom';

/*
| Role access sits inside authentication because it is loaded for the signed
| in user's company, and outside the router because the sidebar, the guards
| and the pages all read the same configuration.
*/

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <RoleAccessProvider>
      <BrowserRouter>
        <App />
        <ToastContainer position="bottom-right" />
      </BrowserRouter>
    </RoleAccessProvider>
  </AuthProvider>
);
