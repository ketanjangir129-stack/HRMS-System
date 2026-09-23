const authRoutes = require("./src/routes/authRoutes")
require("dotenv").config();
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
app.use("/api/employees", require("./src/routes/employeeRoutes"));
app.use("/api/auth", authRoutes);
app.listen(PORT,()=>{
    console.log(`Hrms Backend running on http://localhost:${PORT}`);
});

