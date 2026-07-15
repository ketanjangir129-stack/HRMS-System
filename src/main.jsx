import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "./index.css";
import ReactDOM from "react-dom/client";
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <App />
    <ToastContainer position="bottom-right" />
  </AuthProvider>

)