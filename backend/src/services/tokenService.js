const jwt = require("jsonwebtoken");
const genrateToken= (user)=>{
    return jwt.sign(
        {
            employeeId: user.employeeId,
            companyCode:user.companyCode,
            role:user.role,

        },
        process.env.JWT_SECRET,
        {
            expiresIn:process.env.JWT_EXPIRES_IN ||"1d",
        }

    );

};
const verifyToken = (token)=>{
    return jwt.verify(
        token,
        process.env.JWT_SECRET
    );
};

module.exports = {
    genrateToken,
    verifyToken,
};