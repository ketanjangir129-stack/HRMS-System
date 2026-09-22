const db = require("../config/firebase");
const tokenService = require("../services/tokenService");

const authenticate = (req,res, next)=>{
   try{
     const authHeader=req.headers.authorization;
    if(!authHeader){
        return res.status(401).json({
            success:false,
            message:"Autherization token is required.",
        });
    }
    const [type, token]= authHeader.split(" ");

    if(type !== "Bearer" || !token) {
        return res.status(401).json({
            success:false,
            message: "Invalid authorization format.",
        });
    }
    const decoded = tokenService.verifyToken(token);
    req.user = decoded;

    next();
   }
   catch(error){
    console.error("Authentication error:",error);
     
    return res.status(401).json({
        success:false,
        message:"Invalid or expired token.",
    });
   }
};

// Blocks HR / Employee until the temporary password has been changed.
// Must run after `authenticate`. The flag is read from the DB on every
// request, not from the token: a token issued before the change would
// otherwise stay blocked, and one issued before a reset would stay open.
// Leave it off `/auth/me` and `/auth/change-password` — those are the two
// calls a user still on the temporary password needs to get out of it.
const requirePasswordChanged = async (req, res, next) => {
    try {
        const { companyCode, employeeId, role } = req.user || {};

        // Owner signs in with Firebase Auth and has no temporary password.
        if (role === "owner") {
            return next();
        }

        const snapshot = await db
            .ref(
                `companies/${companyCode}/employees/${String(employeeId).toUpperCase()}/account/isPasswordChanged`
            )
            .once("value");

        if (snapshot.val() !== true) {
            return res.status(403).json({
                success: false,
                code: "PASSWORD_CHANGE_REQUIRED",
                message: "Please change your temporary password to continue.",
            });
        }

        next();
    } catch (error) {
        console.error("Password check error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to verify account status.",
        });
    }
};

module.exports={
    authenticate,
    requirePasswordChanged,
};