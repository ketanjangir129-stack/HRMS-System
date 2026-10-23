import { ref, get, update } from "firebase/database";
import { db } from "../firebase/firebase";

// Company registration backend par hoti hai: POST /api/auth/register-company
// (services/api/authApi.js → registerCompanyApi)

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

/*
|--------------------------------------------------------------------------
| Owner / Company Profile Update
|--------------------------------------------------------------------------
| Owner ka apna koi employee record hota hi nahi — uska naam, mobile aur
| address company ke `details` node me hi rehte hain (registration me wahi
| bhara tha). Isliye "owner apni profile edit kar raha hai" ka matlab yahi
| node update karna hai, kisi employee ko chhedna nahi.
|
| email jaan-boojh kar is list me nahi hai. Owner Firebase Auth se login karta
| hai aur loginUser() us Auth email ko `details.email` se match karta hai —
| sirf DB me email badal dene se owner apne hi account se bahar ho jaata.
| Uske liye Firebase Auth ka email change (re-authentication ke saath) chahiye,
| jo alag kaam hai.
|
| companyCode bhi nahi badalta: wahi har record ka path hai (companies/<code>),
| aur employees/hrs/tasks sab usi ke neeche baithe hain.
*/
const EDITABLE_COMPANY_FIELDS = [
  "companyName",
  "ownerName",
  "mobile",
  "address",
  "ownerPhoto",
];

export const updateCompanyDetails = async (companyCode, updates) => {
  try {
    const code = String(companyCode ?? "").trim().toUpperCase();

    if (!code) {
      return {
        success: false,
        message: "Company code is missing.",
      };
    }

    // Sirf allowed keys aage jaati hain — form se aaya koi extra field
    // details node me chupke se likha na jaye
    const payload = {};

    EDITABLE_COMPANY_FIELDS.forEach((field) => {
      if (updates?.[field] === undefined) return;
      payload[field] = String(updates[field]).trim();
    });

    if (Object.keys(payload).length === 0) {
      return {
        success: false,
        message: "Nothing to update.",
      };
    }

    const detailsRef = ref(db, `companies/${code}/details`);

    const snapshot = await get(detailsRef);

    if (!snapshot.exists()) {
      return {
        success: false,
        message: "Company not found.",
      };
    }

    // set() poora node replace kar deta — ownerUid, status, createdAt sab ud
    // jaate. update() sirf yahi keys likhta hai.
    await update(detailsRef, payload);

    /*
    | Poora details wapas bhejte hain (purana snapshot + abhi likhi keys) taaki
    | caller apna company state bilkul usi shape me rakh sake jo
    | getCompanyByCode deta hai — warna aadha object set karne par companyCode
    | jaisi keys gayab ho jaati.
    */
    return {
      success: true,
      data: { ...snapshot.val(), ...payload },
    };
  } catch (error) {
    console.error("Failed to update company details:", error);

    return {
      success: false,
      message: "Failed to update company details.",
    };
  }
};