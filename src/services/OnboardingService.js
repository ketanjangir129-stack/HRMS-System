import { db } from "../firebase/firebase";
import {
    ref,
    get,
    set,
    update,
}
    from "firebase/database";
import {
    addToIdentityIndex,
    buildEmployeeIdentityIndex,
    checkEmployeeUniqueness,
    findIdentityConflict,
} from "./ValidationService";
import { notifyOnboardingSubmitted } from "./notifications/onboardingNotificationService";
import { OWNER_ROLE } from "../utils/permissions/permissionConstants";

/*
| The link the joiner is sent, and the only way into their form. It is built
| from the id rather than a random token because the form is looked up by
| that id on the way back in.
*/
const buildInvitationLink = (companyCode, employeeId) =>
    `${window.location.origin}/onboarding/${companyCode}/${employeeId}`;

/*
| The record a new invitation writes, in one place so a single invite and a
| bulk import cannot quietly diverge in what they store.
*/
const buildOnboardingRecord = (
    employeeId,
    employeeInfo,
    invitationLink
) => ({
    employmentInfo: {
        employeeId,

        name: String(employeeInfo.name || "").trim(),

        email: String(employeeInfo.email || "").trim(),

        mobile: String(employeeInfo.mobile || "").trim(),

        department: employeeInfo.department,

        designation: employeeInfo.designation,
        joiningDate: employeeInfo.joiningDate,
        employeeType: employeeInfo.employeeType,
        role: employeeInfo.role,
    },
    account: {
        username: employeeId,
        password: employeeId,
        role: employeeInfo.role,
        status: "Pending",
        isPasswordChanged: false,
    },
    invitationLink,
    personalInfo: {},
    bankInfo: {},
    salaryInfo: {},
    documents: {},
    status: "Invitation Sent",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    submittedAt: null,
    approvedAt: null,
    invitationEmailSentAt: null,
});

/*
| What the screens are handed back about the person they just invited. The
| email service reads its template data straight off this, so it carries the
| employment details as well as the link.
*/
const buildCreatedEmployee = (employeeId, employeeInfo, invitationLink) => ({
    employeeId,
    name: String(employeeInfo.name || "").trim(),
    email: String(employeeInfo.email || "").trim(),
    mobile: String(employeeInfo.mobile || "").trim(),
    department: employeeInfo.department,
    designation: employeeInfo.designation,
    joiningDate: employeeInfo.joiningDate,
    employeeType: employeeInfo.employeeType,
    role: employeeInfo.role,
    invitationLink,
});

export const createOnboardingRequest = async (
    companyCode,
    employeeInfo
) => {
    const employeeId = employeeInfo.employeeId
        .trim()
        .toUpperCase();

    const invitationLink = buildInvitationLink(companyCode, employeeId);

    const validation =
        await checkEmployeeUniqueness(
            companyCode,
            employeeInfo
        );

    if (!validation.success) {
        return validation;
    }


    const onboardingRef = ref(
        db,
        `companies/${companyCode}/onboardingRequests/${employeeId}`
    );

    await set(
        onboardingRef,
        buildOnboardingRecord(
            employeeId,
            employeeInfo,
            invitationLink
        )
    );

    return {
        success: true,
        message: "Onboarding request created successfully.",
        invitationLink,
        employee: buildCreatedEmployee(
            employeeId,
            employeeInfo,
            invitationLink
        ),
    };
};

/*
|--------------------------------------------------------------------------
| Bulk Invitations
|--------------------------------------------------------------------------
| A file of rows, each one onboarded in turn and reported on by itself. The
| run never stops at a bad row: a duplicate id or a write that fails marks
| that row and the rest carry on, because a spreadsheet of two hundred
| joiners is not worth re-uploading over one of them.
|
| Uniqueness is checked against an index read once rather than by calling
| `checkEmployeeUniqueness` per row — that would re-read the whole company
| for every line. Each written row is added to the index, which is also what
| catches a file that lists the same person twice.
|
| `onProgress(done, total)` is called after every row so the screen can show
| the run advancing.
*/

export const createBulkOnboardingRequests = async (
    companyCode,
    employees = [],
    onProgress
) => {

    const total = employees.length;

    const index = await buildEmployeeIdentityIndex(companyCode);

    const results = [];

    for (let position = 0; position < total; position += 1) {

        const employeeInfo = employees[position];

        const employeeId = String(employeeInfo.employeeId || "")
            .trim()
            .toUpperCase();

        const row = {
            rowNumber: employeeInfo.rowNumber,
            employeeId,
            name: String(employeeInfo.name || "").trim(),
            email: String(employeeInfo.email || "").trim(),
            mobile: String(employeeInfo.mobile || "").trim(),
            department: employeeInfo.department,
            designation: employeeInfo.designation,
            joiningDate: employeeInfo.joiningDate,
            employeeType: employeeInfo.employeeType,
            role: employeeInfo.role,
        };

        const conflict = findIdentityConflict(index, {
            employeeId,
            email: row.email,
            mobile: row.mobile,
        });

        if (conflict) {

            results.push({
                ...row,
                success: false,
                field: conflict.field,
                message: conflict.message,
                invitationLink: "",
            });

        } else {

            try {

                const invitationLink = buildInvitationLink(
                    companyCode,
                    employeeId
                );

                await set(
                    ref(
                        db,
                        `companies/${companyCode}/onboardingRequests/${employeeId}`
                    ),
                    buildOnboardingRecord(
                        employeeId,
                        employeeInfo,
                        invitationLink
                    )
                );

                /* Only once it is stored is this person taken. */
                addToIdentityIndex(index, {
                    employeeId,
                    email: row.email,
                    mobile: row.mobile,
                });

                results.push({
                    ...row,
                    success: true,
                    message: "",
                    invitationLink,
                });

            } catch (error) {

                console.error(
                    `Could not onboard ${employeeId}:`,
                    error
                );

                results.push({
                    ...row,
                    success: false,
                    message: error.message || "Could not save this record.",
                    invitationLink: "",
                });

            }
        }

        if (typeof onProgress === "function") {
            onProgress(results.length, total);
        }
    }

    return results;
};

/*
|--------------------------------------------------------------------------
| Stamping a Sent Invitation
|--------------------------------------------------------------------------
| Called after the email has already left, which is why it swallows its own
| failures: the invitation is gone either way, and a screen that reported
| "not sent" because a timestamp would not write would have the user send it
| a second time.
|
| The request is read first so a stamp for a record that has since been
| approved or deleted cannot recreate it as a stub.
*/

export const markInvitationEmailSent = async (companyCode, employeeId) => {

    if (!companyCode || !employeeId) {
        return false;
    }

    try {

        const requestRef = ref(
            db,
            `companies/${companyCode}/onboardingRequests/${employeeId}`
        );

        const snapshot = await get(requestRef);

        if (!snapshot.exists()) {
            return false;
        }

        await update(requestRef, {
            invitationEmailSentAt: Date.now(),
            updatedAt: Date.now(),
        });

        return true;

    } catch (error) {

        console.error(
            `Could not stamp the invitation email for ${employeeId}:`,
            error
        );

        return false;

    }
};
/*
|--------------------------------------------------------------------------
| Onboarding History
|--------------------------------------------------------------------------
| A history entry holds only the decision: employee id, status, who made it
| and when. The person's name, department and designation are read from
| wherever the record now lives — the employee node for an approval, the
| request (which a rejection leaves in place) for a rejection.
|
| Only the `personalInfo/name` and `employmentInfo` branches are read, one
| pair per entry and all in parallel, so the whole employees node is never
| downloaded to fill a few columns.
|
| Entries written before this change still carry `action` and a full
| `request` copy; those are used as they are.
*/

const readValue = async (path) => {
    const snapshot = await get(ref(db, path));
    return snapshot.exists() ? snapshot.val() : null;
};

const loadHistoryDetails = async (companyCode, employeeId, status) => {

    if (status === "Approved") {

        const [name, employment] = await Promise.all([
            readValue(`companies/${companyCode}/employees/${employeeId}/personalInfo/name`),
            readValue(`companies/${companyCode}/employees/${employeeId}/employmentInfo`),
        ]);

        return {
            name: name || "",
            department: employment?.department || "",
            designation: employment?.designation || "",
        };
    }

    const employment = await readValue(
        `companies/${companyCode}/onboardingRequests/${employeeId}/employmentInfo`
    );

    return {
        name: employment?.name || "",
        department: employment?.department || "",
        designation: employment?.designation || "",
    };
};

export const getOnboardingHistory = async (companyCode) => {

    const data = await readValue(
        `companies/${companyCode}/onboardingHistory`
    );

    if (!data) {
        return [];
    }

    const entries = await Promise.all(
        Object.keys(data).map(async (id) => {

            const entry = data[id] || {};

            const employeeId = entry.employeeId || id;

            const status = entry.status || entry.action || "";

            const legacy = entry.request?.employmentInfo;

            const details = legacy
                ? {
                    name: legacy.name || "",
                    department: legacy.department || "",
                    designation: legacy.designation || "",
                }
                : await loadHistoryDetails(companyCode, employeeId, status);

            return {
                id,
                employeeId,
                status,
                decidedBy: entry.approvedBy || entry.rejectedBy || "",
                decidedAt: entry.approvedAt || entry.rejectedAt || null,
                ...details,
            };
        })
    );

    /*
    | Approvers are looked up once each, however many entries they decided.
    | Entries written before approvers were stored by id hold a name such as
    | "Admin"; with no employee under that key, it is shown as it was stored.
    */
    const approverIds = [
        ...new Set(entries.map((entry) => entry.decidedBy).filter(Boolean)),
    ];

    const approverNames = Object.fromEntries(
        await Promise.all(
            approverIds.map(async (approverId) => {

                const name = approverId === OWNER_ROLE
                    ? await readValue(`companies/${companyCode}/details/ownerName`)
                    : await readValue(`companies/${companyCode}/employees/${approverId}/personalInfo/name`);

                return [approverId, name || ""];
            })
        )
    );

    return entries.map((entry) => ({
        ...entry,
        decidedByName: approverNames[entry.decidedBy] || "",
    }));
};


export const getOnboardingRequests = async (companyCode) => {

    const requestRef = ref(
        db,
        `companies/${companyCode}/onboardingRequests`
    );

    const snapshot = await get(requestRef);

    if (!snapshot.exists()) {
        return [];
    }

    const data = snapshot.val();

    return Object.keys(data).map((id) => ({
        id,
        ...data[id],
    }));
};

export const getOnboardingRequestById = async (
    companyCode,
    requestId
) => {
    try {
        const requestRef = ref(
            db,
            `companies/${companyCode}/onboardingRequests/${requestId}`
        );

        const snapshot = await get(requestRef);

        if (!snapshot.exists()) {
            return null;
        }

        return {
            id: snapshot.key,
            ...snapshot.val(),
        };
    } catch (error) {
        console.error("Error fetching onboarding request:", error);
        throw error;
    }
};

export const submitOnboardingForm = async (
    companyCode,
    employeeId,
    formData
) => {
    try {

        const requestRef = ref(
            db,
            `companies/${companyCode}/onboardingRequests/${employeeId}`
        );

        const snapshot = await get(requestRef);

        if (!snapshot.exists()) {
            return {
                success: false,
                message: "Request not found",
            };
        }

        const existingData = snapshot.val();

        if (
            existingData.status === "Pending Approval" ||
            existingData.status === "Approved"
        ) {
            return {
                success: false,
                message: "Onboarding form already submitted.",
            };
        }

        await set(requestRef, {
            ...existingData,

            personalInfo: {
                fatherName: formData.fatherName,
                motherName: formData.motherName,
                dob: formData.dob,
                gender: formData.gender,
                maritalStatus: formData.maritalStatus,

                personalMobile: formData.personalMobile,
                alternateMobile: formData.alternateMobile,

                address: formData.address,
                city: formData.city,
                state: formData.state,
                pincode: formData.pincode,
            },

            education: existingData.education || {},
            experience: existingData.experience || {},

            bankInfo: {
                accountHolderName: formData.accountHolderName,
                bankName: formData.bankName,
                accountNumber: formData.accountNumber,
                ifscCode: formData.ifscCode,
                branchName: formData.branchName,
            },

            documents: {
                aadhaarNumber: formData.aadhaarNumber,
                panNumber: formData.panNumber,
                uanNumber: formData.uanNumber,
                esicNumber: formData.esicNumber,
            },

            status: "Pending Approval",
            submittedAt: Date.now(),
            updatedAt: Date.now(),
        });
            /*
        | Announced only once the submission is safely stored, and never
        | allowed to fail it: the form is filled in through a public link the
        | candidate cannot open a second time, so a submission lost to a
        | notification error would strand them. A request that was stored but
        | not announced is recoverable from the requests screen; one that was
        | announced but not stored is not.
        */

        try {

            await notifyOnboardingSubmitted(
                companyCode,
                existingData,
                employeeId
            );

        } catch (notificationError) {

            console.error(
                "Failed to notify onboarding approvers:",
                notificationError
            );

        }

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