import { ref, set, get } from "firebase/database";
import { db } from "../firebase/firebase";

//  Register Company
export const registerCompany = async (companyData) => {
    
    const companyCode = companyData.companyCode.trim().toUpperCase();

    await set(
        ref(db, `companies/${companyCode}`),
        {
            details: {
                ...companyData,
                companyCode,
                createdAt: Date.now(),
            },

            hrs: {},
            employees: {},
            tasks: {},
        }
    );
};

export const getCompanyByCode = async (uid) => {
  const snapshot = await get(ref(db, `companies/${uid}`));

  if (snapshot.exists()) {
    return snapshot.val();
  }

  return null;
};

export const getCompanyByUID = async (uid) => {
  return getCompanyByCode(uid);
};