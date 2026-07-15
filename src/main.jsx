<<<<<<< HEAD
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Dashboard from "./pages/Dashboard";
// import App from "./App";
import { AuthProvider } from "./context/AuthContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      {/* <App /> */}
      <Dashboard />
    </AuthProvider>
  </StrictMode>
);
=======
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <App />
    <ToastContainer position="bottom-right" />
  </AuthProvider>
>>>>>>> 81602f9f41afa4f359225af27ca9140bb6226ecd

