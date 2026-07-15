import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import Register from "./components/authenticate/Register.jsx"

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <Register />
  </AuthProvider>

)
