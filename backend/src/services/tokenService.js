const jwt = require("jsonwebtoken");
const genrateToken= (user)=>{
    return jwt.sign(
        {
            // toSafeUser record ki shape lautata hai — id employmentInfo ke andar hai
            employeeId: user.employmentInfo?.employeeId || user.employeeId,
            companyCode:user.companyCode,
            role:user.role,

        },
        process.env.JWT_SECRET,
        {
            expiresIn:process.env.JWT_EXPIRES_IN ||"1d",
        }

    );

};
// Owner ka koi employee record nahi hota, isliye employeeId nahi — uski
// jagah Firebase uid. authenticate isse bhi waise hi verify karta hai.
const genrateOwnerToken = ({ uid, companyCode }) => {
    return jwt.sign(
        {
            uid,
            companyCode,
            role: "owner",
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "1d",
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
    genrateOwnerToken,
    verifyToken,
};