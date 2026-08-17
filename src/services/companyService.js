import { ref, set, get } from "firebase/database";
import { db } from "../firebase/firebase";
import { createOwnerIndex } from "./userIndexService";
import { normalizeCompanyCode } from "../utils/auth/employeeIdentity";

/*
| Availability check. Reads /companyCodes rather than /companies because the
| rules only let a caller read their own company — but registration has to ask
| about a code that, by definition, is not theirs yet. /companyCodes holds
| nothing but code -> ownerUid, so it is readable by any signed-in user.
|
| Requires an Auth session: call it after the owner's account exists.
*/
export const checkCompanyCodeExists = async (companyCode) => {
    const code = normalizeCompanyCode(companyCode);

    const snapshot = await get(ref(db, `companyCodes/${code}`));

    return snapshot.exists();
};

/*
| Registration, in the order the rules require:
|
|   1. claim the code       — /companyCodes/{code} = uid, only if unclaimed
|   2. create the company   — allowed only while the node does not exist, and
|                             only if details/ownerUid matches the claim
|   3. link the owner       — /userIndex/{uid}, accepted only once the company
|                             already names this uid as its owner
|
| Each step is the evidence the next one is checked against, which is what
| stops a signed-in user from minting themselves an owner row against somebody
| else's company. A failure part way through leaves an orphaned claim rather
| than a half-built company: the code stays taken by that uid, and the same
| owner can retry it.
*/
export const createCompany = async (companyData) => {
    try {
        const companyCode = normalizeCompanyCode(companyData.companyCode);
        const { ownerUid } = companyData;

        await set(ref(db, `companyCodes/${companyCode}`), ownerUid);

        await set(ref(db, `companies/${companyCode}`), {
            details: {
                ownerUid,
                companyCode,
                companyName: companyData.companyName,
                ownerName: companyData.ownerName,
                email: companyData.email,
                phone: companyData.phone,
                address: companyData.address,
                status: "active",
                createdAt: Date.now(),
            },

            employees: {},
            tasks: {},
        });

        await createOwnerIndex({ uid: ownerUid, companyCode });

        return {
            success: true,
        };
    } catch (error) {
        console.error(error);

        return {
            success: false,
            message: error.message,
        };
    }
};

export const getCompanyByCode = async (companyCode) => {
    const code = normalizeCompanyCode(companyCode);

    const snapshot = await get(ref(db, `companies/${code}/details`));

    if (!snapshot.exists()) {
        return null;
    }

    return snapshot.val();
};
