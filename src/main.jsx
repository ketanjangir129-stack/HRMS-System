import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider>
  <BrowserRouter>
    <App />
    <ToastContainer position="bottom-right" />
  </BrowserRouter>
  </AuthProvider>
);