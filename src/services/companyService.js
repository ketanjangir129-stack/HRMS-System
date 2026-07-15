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

//  Login Company

export const loginCompany = async ({
    companyCode,
    email,
    password,
}) => {
    try {
        const snapshot = await get(
            ref(
                db,
                `companies/${companyCode.toUpperCase()}`
            )
        );

        if (!snapshot.exists()) {
            return {
                success: false,
                message: "Company not found",
            };
        }

        const company = snapshot.val();

        if (
            company.details.email !== email
        ) {
            return {
                success: false,
                message: "Invalid Email",
            };
        }

        if (
            company.details.password !== password
        ) {
            return {
                success: false,
                message: "Invalid Password",
            };
        }

        return {
            success: true,
            company,
        };
    } catch (error) {
        return {
            success: false,
            message: error.message,
        };
    }
};

//  Get Company By Code

export const getCompanyByCode = async(companyCode) => {
    const snapshot = await get(
        ref(
            db,
            `companies/${companyCode}`
        )
    );

    if (!snapshot.exists()) {
        return null;
    }

    return snapshot.val();
};