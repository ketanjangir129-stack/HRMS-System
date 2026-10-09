require("dotenv").config();
const authRoutes = require("./src/routes/authRoutes")
const employeesRoutes = require("./src/routes/employeeRoutes");
const departmentsRoutes = require("./src/routes/departmentsRoutes");
const attendanceRoutes = require("./src/routes/attendanceRoutes");
const uploadRoutes = require("./src/routes/uploadRoutes");
const express = require("express");
const cors = require("cors");

const app = express();

// =======================
// Middleware
// =======================


app.use (cors());
app.use(express.json());

//=======================
// health check 
// ======================

app.get("/",(req,res)=>{
    res.status(200).json({
        sucsess:true,
        message:"hrms Backend Api is running",
        version: "1.0.0"
    });
});

//===========================
// server
// =================
const PORT = process.env.PORT || 5000;
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/api/departments", departmentsRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/upload", uploadRoutes);
app.listen(PORT,()=>{
    console.log(`Hrms Backend running on http://localhost:${PORT}`);
});




