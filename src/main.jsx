import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "./index.css";
import ReactDOM from "react-dom/client";
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'


ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <App />
  </AuthProvider>

)
