import { ref, set, get } from "firebase/database";
import { db } from "../firebase/firebase";

//  Register Company
export const checkCompanyCodeExists = async (companyCode) => {
    try {
        const snapshot = await get(
            ref(db, `companies/${companyCode}`)
        );

        return snapshot.exists();
    } catch (error) {
        throw error;
    }
};


export const createCompany   = async (companyData) => {

    try {
        const companyCode = companyData.companyCode.trim().toUpperCase();

        await set(
            ref(db, `companies/${companyCode}`),
            {
                details: {
                    ownerUid: companyData.ownerUid,
                    companyCode,
                    companyName: companyData.companyName,
                    ownerName: companyData.ownerName,
                    email: companyData.email,
                    phone: companyData.phone,
                    address: companyData.address,
                    status: "active",
                    createdAt: Date.now(),
                },

                hrs: {},
                employees: {},
                tasks: {},
            }
        );
        return {
            success: true,
        };

    } catch (error) {
        return {
            success: false,
            message: error.message,
        };

    }

}
export const getCompanyByCode = async (companyCode) => {
  try {
    const code = companyCode.trim().toUpperCase();

    const snapshot = await get(
      ref(db, `companies/${code}/details`)
    );

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.val();
  } catch (error) {
    throw error;
  }
};