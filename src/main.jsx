import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Register from "./pages/authenticate/register.jsx"

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Register />
  </StrictMode>,
)
