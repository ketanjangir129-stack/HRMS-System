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

module.exports={
    authenticate,
};