const roleAccessService = require("../services/roleAccessService");
const { hasPermission, isOwnerRole } = require("../utils/permissions");

/*
| Owner ka Roles & Access hi source of truth hai.
|
| Permission har request par DB se padhi jaati hai, token se nahi: owner ne
| abhi switch band kiya ho to purana token use lekar ghoomta rahega. Wahi
| wajah jisse requirePasswordChanged flag DB se padhta hai.
|
| `authenticate` ke baad hi lagta hai — req.user isi se aata hai.
*/
const requirePermission = (path) => async (req, res, next) => {
  try {
    const { companyCode, role } = req.user || {};

    if (!companyCode || !role) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required.",
      });
    }

    // Frontend bhi storage padhe bina owner ko allow karta hai
    if (isOwnerRole(role)) {
      return next();
    }

    /*
    | Permission token ki company par lagti hai. Body me doosri company aayi
    | to wo permission is check se hoke nahi jaani chahiye — warna ek company
    | ka HR doosri company me employee bana deta.
    */
    const bodyCompanyCode = req.body?.companyCode;

    if (bodyCompanyCode && String(bodyCompanyCode) !== String(companyCode)) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this company.",
      });
    }

    const stored = await roleAccessService.getRoleAccessForRole(
      companyCode,
      role
    );

    if (!hasPermission(stored, role, path)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action.",
      });
    }

    next();
  } catch (error) {
    console.error("Permission check error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify permissions.",
    });
  }
};

module.exports = {
  requirePermission,
};
