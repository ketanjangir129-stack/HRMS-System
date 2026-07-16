import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardLayout from "./layouts/Dashboard";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import EmployeeForm from "./pages/EmployeeForm";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />

          <Route path="employee" element={<Employees />} />
          <Route path="employee/add" element={<EmployeeForm />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;