require("dotenv").config();
const authRoutes = require("./src/routes/authRoutes")
const employeesRoutes = require("./src/routes/employeeRoutes");
const departmentsRoutes = require("./src/routes/departmentsRoutes");
const attendanceRoutes = require("./src/routes/attendanceRoutes");
const resignationRoutes = require("./src/routes/resignation.routes");
const uploadRoutes = require("./src/routes/uploadRoutes");
const leaveRoutes       =   require("./src/routes/leaveRoutes");
const statutoryComplianceRoutes = require("./src/routes/statutorycomplianceRoutes");
const holidaysRoutes = require("./src/routes/holidayRoutes");
const onboardingRoutes = require("./src/routes/onboardingRoutes");
const salaryRoutes = require("./src/routes/salaryRoutes");
const payrollRoutes = require("./src/routes/payrollRoutes");
const reimbursementRoutes = require("./src/routes/reimbursementRoutes");
const taskRoutes = require("./src/routes/taskRoutes");;
const taskDueJob = require("./src/jobs/taskDueJob");
const taskWorkJob = require("./src/jobs/taskWorkJob");

const express = require("express");
const cors = require("cors");
const compression = require("compression");

const app = express();

// =======================
// Middleware
// =======================


app.use (cors());
// Default limit is 100kb, too small for bulk onboarding / salary imports.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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
app.use("/api/companies/:companyCode/resignations", resignationRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/statutory-compliance", statutoryComplianceRoutes);
app.use("/api/holidays", holidaysRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/salary", salaryRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/reimbursement", reimbursementRoutes);
// Task list poori company ki hoti hai aur har badlaav par dobara aati hai —
// gzip se JSON 5-10 guna chhota (1KB se chhote jawab waise hi jaate hain)
app.use("/api/tasks", compression(), taskRoutes);


app.listen(PORT,()=>{
    console.log(`Hrms Backend running on http://localhost:${PORT}`);
    // Task due/overdue khabrein — har ghante, browser ke bina
    taskDueJob.start();
    // 10 ghante se zyada chal rahe (bhoole hue) timer band
    taskWorkJob.start();
});
