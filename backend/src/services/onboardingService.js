const db = require("../config/firebase");
const { uploadFile } = require("./uploadServices");
const {
  loadDepartments,
  toDepartmentRefs,
  withDepartmentNames,
} = require("../utils/departmentRefs");

const OWNER_ROLE = "owner";

const normalize = (value) => String(value ?? "").trim().toLowerCase();

const buildInvitationLink = (companyCode, employeeId, origin) => {
  const base = origin ? String(origin).replace(/\/+$/, "") : "";
  return `${base}/onboarding/${companyCode}/${employeeId}`;
};

const buildOnboardingRecord = (employeeId, employeeInfo, invitationLink) => ({
  employmentInfo: {
    employeeId,
    name: String(employeeInfo.name || "").trim(),
    email: String(employeeInfo.email || "").trim(),
    mobile: String(employeeInfo.mobile || "").trim(),
    department: employeeInfo.department,
    designation: employeeInfo.designation,
    joiningDate: employeeInfo.joiningDate,
    employeeType: employeeInfo.employeeType,
    role: employeeInfo.role || "employee",
  },
  account: {
    username: employeeId,
    password: employeeId,
    role: employeeInfo.role || "employee",
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

const buildCreatedEmployee = (employeeId, employeeInfo, invitationLink) => ({
  employeeId,
  name: String(employeeInfo.name || "").trim(),
  email: String(employeeInfo.email || "").trim(),
  mobile: String(employeeInfo.mobile || "").trim(),
  department: employeeInfo.department,
  designation: employeeInfo.designation,
  joiningDate: employeeInfo.joiningDate,
  employeeType: employeeInfo.employeeType,
  role: employeeInfo.role || "employee",
  invitationLink,
});

const toEmailRecipient = (request, employeeId) => {
  const employment = request.employmentInfo || {};
  const account = request.account || {};

  return {
    employeeId,
    name: employment.name || "",
    email: employment.email || "",
    designation: employment.designation || "",
    department: employment.department || "",
    joiningDate: employment.joiningDate || "",
    username: account.username || employeeId,
    temporaryPassword: account.isPasswordChanged ? "" : account.password || "",
  };
};

const buildEmployeeIdentityIndex = async (companyCode) => {
  const [employeeSnapshot, onboardingSnapshot] = await Promise.all([
    db.ref(`companies/${companyCode}/employees`).once("value"),
    db.ref(`companies/${companyCode}/onboardingRequests`).once("value"),
  ]);

  const employees = employeeSnapshot.val() || {};
  const requests = onboardingSnapshot.val() || {};

  const records = [...Object.values(employees), ...Object.values(requests)];

  const index = {
    employeeIds: new Set(),
    emails: new Set(),
    mobiles: new Set(),
  };

  records.forEach((record) => {
    const employment = record.employmentInfo || {};
    const personal = record.personalInfo || {};

    const employeeId = normalize(employment.employeeId);
    const email = normalize(personal.email || employment.email);
    const mobile = normalize(personal.mobile || employment.mobile);

    if (employeeId) index.employeeIds.add(employeeId);
    if (email) index.emails.add(email);
    if (mobile) index.mobiles.add(mobile);
  });

  return index;
};

const addToIdentityIndex = (index, employee = {}) => {
  const employeeId = normalize(employee.employeeId);
  const email = normalize(employee.email);
  const mobile = normalize(employee.mobile);

  if (employeeId) index.employeeIds.add(employeeId);
  if (email) index.emails.add(email);
  if (mobile) index.mobiles.add(mobile);

  return index;
};

const findIdentityConflict = (index, employee = {}) => {
  const employeeId = normalize(employee.employeeId);
  const email = normalize(employee.email);
  const mobile = normalize(employee.mobile);

  if (employeeId && index.employeeIds.has(employeeId)) {
    return {
      field: "employeeId",
      message: "Employee ID already exists.",
    };
  }

  if (email && index.emails.has(email)) {
    return {
      field: "email",
      message: "Email already exists.",
    };
  }

  if (mobile && index.mobiles.has(mobile)) {
    return {
      field: "mobile",
      message: "Mobile number already exists.",
    };
  }

  return null;
};

const createOnboardingRequest = async (companyCode, employeeInfo, origin) => {
  const employeeId = String(employeeInfo.employeeId || "").trim().toUpperCase();

  if (!employeeId) {
    return {
      success: false,
      message: "Employee ID is required.",
    };
  }

  const index = await buildEmployeeIdentityIndex(companyCode);
  const conflict = findIdentityConflict(index, {
    employeeId,
    email: employeeInfo.email,
    mobile: employeeInfo.mobile,
  });

  if (conflict) {
    return {
      success: false,
      field: conflict.field,
      message: conflict.message,
    };
  }

  const invitationLink = buildInvitationLink(companyCode, employeeId, origin);

  const record = buildOnboardingRecord(employeeId, employeeInfo, invitationLink);

  await db
    .ref(`companies/${companyCode}/onboardingRequests/${employeeId}`)
    .set(record);

  return {
    success: true,
    message: "Onboarding request created successfully.",
    invitationLink,
    employee: buildCreatedEmployee(employeeId, employeeInfo, invitationLink),
  };
};

const createBulkOnboardingRequests = async (companyCode, employees = [], origin) => {
  const total = employees.length;
  const index = await buildEmployeeIdentityIndex(companyCode);
  const results = [];

  for (let position = 0; position < total; position += 1) {
    const employeeInfo = employees[position];
    const employeeId = String(employeeInfo.employeeId || "").trim().toUpperCase();

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
      role: employeeInfo.role || "employee",
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
        const invitationLink = buildInvitationLink(companyCode, employeeId, origin);
        const record = buildOnboardingRecord(employeeId, employeeInfo, invitationLink);

        await db
          .ref(`companies/${companyCode}/onboardingRequests/${employeeId}`)
          .set(record);

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
        console.error(`Could not onboard ${employeeId}:`, error);
        results.push({
          ...row,
          success: false,
          message: error.message || "Could not save this record.",
          invitationLink: "",
        });
      }
    }
  }

  return results;
};

const getOnboardingRequests = async (companyCode) => {
  const snapshot = await db
    .ref(`companies/${companyCode}/onboardingRequests`)
    .once("value");

  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val();
  return Object.keys(data).map((id) => ({
    id,
    ...data[id],
  }));
};

const getOnboardingRequestById = async (companyCode, employeeId) => {
  const cleanId = String(employeeId || "").trim().toUpperCase();
  const snapshot = await db
    .ref(`companies/${companyCode}/onboardingRequests/${cleanId}`)
    .once("value");

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: cleanId,
    ...snapshot.val(),
  };
};

const notifyOnboardingSubmittedInBackend = async (companyCode, request, employeeId) => {
  try {
    const employeesSnap = await db
      .ref(`companies/${companyCode}/employees`)
      .once("value");

    const employees = employeesSnap.val() || {};
    const approverIds = [OWNER_ROLE];

    Object.entries(employees).forEach(([empId, emp]) => {
      const role = String(emp?.account?.role || "").toLowerCase();
      const status = String(emp?.account?.status || "").toLowerCase();
      if (status === "active" && (role === "hr" || role === "owner")) {
        approverIds.push(empId);
      }
    });

    const uniqueApprovers = [...new Set(approverIds)];
    const employeeName =
      request?.employmentInfo?.name || employeeId || "A candidate";

    const payload = {
      event: "ONBOARDING_REQUEST",
      type: "ONBOARDING",
      title: "New Onboarding Request",
      message: `${employeeName} (${employeeId}) has submitted the onboarding form.`,
      entityType: "onboarding",
      entityId: employeeId,
      route: "/OnboardDashboard/OnBoardRequest",
      createdBy: employeeId || "",
      read: false,
      createdAt: Date.now(),
    };

    await Promise.all(
      uniqueApprovers.map(async (recipientId) => {
        const notifRef = db
          .ref(`companies/${companyCode}/notifications/${recipientId}`)
          .push();
        await notifRef.set({
          id: notifRef.key,
          ...payload,
        });
      })
    );
  } catch (error) {
    console.error("Backend notification error on onboarding submission:", error);
  }
};

const submitOnboardingForm = async (companyCode, employeeId, formData, files = {}) => {
  const cleanId = String(employeeId || "").trim().toUpperCase();
  const requestRef = db.ref(`companies/${companyCode}/onboardingRequests/${cleanId}`);
  const snapshot = await requestRef.once("value");

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

  // Upload provided documents to storage (Cloudinary) — files are optional
  const DOCUMENT_UPLOAD_FIELDS = ["aadhaarCard", "panCard", "resume", "passportPhoto"];
  const documentUploads = {};
  for (const field of DOCUMENT_UPLOAD_FIELDS) {
    const file = files?.[field]?.[0];
    if (!file || !file.buffer || file.buffer.length === 0) continue;
    try {
      const uploadResult = await uploadFile(file.buffer, {
        folder: `companies/${companyCode}/onboarding/${cleanId}`,
        resourceType: "auto",
        maxBytes: 5 * 1024 * 1024,
        fileName: file.originalname,
      });
      documentUploads[`${field}Url`] = uploadResult.url;
    } catch (uploadError) {
      console.error(`Onboarding document upload error (${field}):`, uploadError);
      return {
        success: false,
        status: 502,
        field,
        message: "Failed to upload document to storage.",
      };
    }
  }

  const updatedRecord = {
    ...existingData,
    personalInfo: {
      fatherName: formData.fatherName || "",
      motherName: formData.motherName || "",
      dob: formData.dob || "",
      gender: formData.gender || "",
      maritalStatus: formData.maritalStatus || "",
      personalMobile: formData.personalMobile || "",
      alternateMobile: formData.alternateMobile || "",
      address: formData.address || "",
      city: formData.city || "",
      state: formData.state || "",
      pincode: formData.pincode || "",
    },
    education: existingData.education || {},
    experience: existingData.experience || {},
    bankInfo: {
      accountHolderName: formData.accountHolderName || "",
      bankName: formData.bankName || "",
      accountNumber: formData.accountNumber || "",
      ifscCode: formData.ifscCode || "",
      branchName: formData.branchName || "",
    },
    documents: {
      ...existingData.documents,
      aadhaarNumber: formData.aadhaarNumber || "",
      panNumber: formData.panNumber || "",
      uanNumber: formData.uanNumber || "",
      esicNumber: formData.esicNumber || "",
      ...documentUploads,
    },
    status: "Pending Approval",
    submittedAt: Date.now(),
    updatedAt: Date.now(),
  };

  await requestRef.set(updatedRecord);

  // Trigger approver notifications asynchronously
  notifyOnboardingSubmittedInBackend(companyCode, existingData, cleanId).catch(
    (err) => console.error("Notification trigger error:", err)
  );

  return {
    success: true,
    message: "Onboarding form submitted successfully.",
  };
};

const toEmployeeRecord = (request, employeeId, departmentRefs) => {
  const employment = request.employmentInfo || {};
  const personal = request.personalInfo || {};
  const bank = request.bankInfo || {};
  const documents = request.documents || {};

  return {
    personalInfo: {
      name: employment.name || "",
      email: employment.email || "",
      mobile: employment.mobile || "",
      address: personal.address || "",
      gender: personal.gender || "",
      dob: personal.dob || "",
      fatherName: personal.fatherName || "",
      motherName: personal.motherName || "",
      maritalStatus: personal.maritalStatus || "",
      alternateMobile: personal.alternateMobile || "",
      city: personal.city || "",
      state: personal.state || "",
      pincode: personal.pincode || "",
    },
    employmentInfo: {
      employeeId,
      departmentId: departmentRefs.departmentId,
      designationId: departmentRefs.designationId,
      joiningDate: employment.joiningDate || "",
      employeeType: employment.employeeType || "",
      role: employment.role || "employee",
    },
    bankInfo: {
      bankName: bank.bankName || "",
      accountHolderName: bank.accountHolderName || "",
      accountNumber: bank.accountNumber || "",
      ifsc: bank.ifsc || bank.ifscCode || "",
      branch: bank.branch || bank.branchName || "",
    },
    documents: {
      aadhaar: documents.aadhaar || documents.aadhaarNumber || "",
      pan: documents.pan || documents.panNumber || "",
      uan: documents.uan || documents.uanNumber || "",
      esic: documents.esic || documents.esicNumber || "",
      // Onboarding form par upload huye documents ke Cloudinary links bhi
      // employee record tak le jaao (resumeUrl/aadhaarCardUrl/panCardUrl/
      // passportPhotoUrl submitOnboardingForm me save hote hain).
      resume: documents.resume || documents.resumeUrl || "",
      aadhaarCard: documents.aadhaarCard || documents.aadhaarCardUrl || "",
      panCard: documents.panCard || documents.panCardUrl || "",
      passportPhoto: documents.passportPhoto || documents.passportPhotoUrl || "",
    },
    account: {
      ...(request.account || {}),
      status: "Active",
    },
  };
};

const approveOnboarding = async (companyCode, employeeId, approvedBy) => {
  const cleanId = String(employeeId || "").trim().toUpperCase();
  const requestRef = db.ref(`companies/${companyCode}/onboardingRequests/${cleanId}`);
  const snapshot = await requestRef.once("value");

  if (!snapshot.exists()) {
    return {
      success: false,
      message: "Onboarding request not found.",
    };
  }

  const request = snapshot.val();
  const departments = await loadDepartments(companyCode);

  const departmentRefs = toDepartmentRefs(
    departments,
    request.employmentInfo?.department,
    request.employmentInfo?.designation
  );

  if (departmentRefs.error) {
    return {
      success: false,
      message: `${departmentRefs.error.message} Update the request before approving.`,
    };
  }

  const approvedAt = Date.now();
  const employee = {
    ...toEmployeeRecord(request, cleanId, departmentRefs),
    approvedAt,
    approvedBy,
    createdAt: request.createdAt || approvedAt,
  };

  await db.ref(`companies/${companyCode}`).update({
    [`employees/${cleanId}`]: employee,
    [`onboardingHistory/${cleanId}`]: {
      employeeId: cleanId,
      status: "Approved",
      approvedBy,
      approvedAt,
    },
    [`onboardingRequests/${cleanId}`]: null,
  });

  return {
    success: true,
    message: "Employee onboarded successfully.",
    employee: toEmailRecipient(request, cleanId),
  };
};

const approveOnboardingRequests = async (companyCode, employeeIds = [], approvedBy) => {
  const approved = [];
  const failed = [];

  for (const employeeId of employeeIds) {
    const result = await approveOnboarding(companyCode, employeeId, approvedBy);
    if (result.success) {
      approved.push({
        employeeId,
        employee: result.employee,
      });
    } else {
      failed.push({
        employeeId,
        message: result.message,
      });
    }
  }

  return { approved, failed };
};

const rejectOnboarding = async (companyCode, employeeId, remarks, rejectedBy) => {
  const cleanId = String(employeeId || "").trim().toUpperCase();
  const requestRef = db.ref(`companies/${companyCode}/onboardingRequests/${cleanId}`);
  const snapshot = await requestRef.once("value");

  if (!snapshot.exists()) {
    return {
      success: false,
      message: "Onboarding request not found.",
    };
  }

  const request = snapshot.val();
  const rejectedAt = Date.now();
  const history = request.history || {};

  history[rejectedAt] = {
    action: "Rejected",
    by: rejectedBy,
    remarks: remarks || "",
    time: rejectedAt,
  };

  await db.ref(`companies/${companyCode}`).update({
    [`onboardingRequests/${cleanId}/status`]: "Rejected",
    [`onboardingRequests/${cleanId}/remarks`]: remarks || "",
    [`onboardingRequests/${cleanId}/rejectedBy`]: rejectedBy,
    [`onboardingRequests/${cleanId}/rejectedAt`]: rejectedAt,
    [`onboardingRequests/${cleanId}/history`]: history,
    [`onboardingHistory/${cleanId}`]: {
      employeeId: cleanId,
      status: "Rejected",
      rejectedBy,
      rejectedAt,
    },
  });

  return {
    success: true,
    message: "Onboarding request rejected.",
  };
};

const rejectOnboardingRequests = async (companyCode, employeeIds = [], remarks, rejectedBy) => {
  const rejected = [];
  const failed = [];

  for (const employeeId of employeeIds) {
    const result = await rejectOnboarding(companyCode, employeeId, remarks, rejectedBy);
    if (result.success) {
      rejected.push({ employeeId });
    } else {
      failed.push({
        employeeId,
        message: result.message,
      });
    }
  }

  return { rejected, failed };
};

const readValue = async (path) => {
  const snapshot = await db.ref(path).once("value");
  return snapshot.exists() ? snapshot.val() : null;
};

const loadHistoryDetails = async (companyCode, employeeId, status, departments) => {
  if (status === "Approved") {
    const [name, stored] = await Promise.all([
      readValue(`companies/${companyCode}/employees/${employeeId}/personalInfo/name`),
      readValue(`companies/${companyCode}/employees/${employeeId}/employmentInfo`),
    ]);

    const employment = withDepartmentNames(
      { employmentInfo: stored || {} },
      departments
    ).employmentInfo;

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

const getOnboardingHistory = async (companyCode) => {
  const [data, departments] = await Promise.all([
    readValue(`companies/${companyCode}/onboardingHistory`),
    readValue(`companies/${companyCode}/departments`),
  ]);

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
        : await loadHistoryDetails(companyCode, employeeId, status, departments || {});

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

  const approverIds = [
    ...new Set(entries.map((entry) => entry.decidedBy).filter(Boolean)),
  ];

  const approverNames = Object.fromEntries(
    await Promise.all(
      approverIds.map(async (approverId) => {
        const name =
          approverId === OWNER_ROLE
            ? await readValue(`companies/${companyCode}/details/ownerName`)
            : await readValue(
                `companies/${companyCode}/employees/${approverId}/personalInfo/name`
              );
        return [approverId, name || ""];
      })
    )
  );

  return entries.map((entry) => ({
    ...entry,
    decidedByName: approverNames[entry.decidedBy] || "",
  }));
};

const markInvitationEmailSent = async (companyCode, employeeId) => {
  if (!companyCode || !employeeId) return false;
  try {
    const cleanId = String(employeeId).trim().toUpperCase();
    const requestRef = db.ref(`companies/${companyCode}/onboardingRequests/${cleanId}`);
    const snapshot = await requestRef.once("value");
    if (!snapshot.exists()) return false;

    await requestRef.update({
      invitationEmailSentAt: Date.now(),
      updatedAt: Date.now(),
    });
    return true;
  } catch (error) {
    console.error(`Could not stamp invitation email for ${employeeId}:`, error);
    return false;
  }
};

const markApprovalEmailSent = async (companyCode, employeeId) => {
  if (!companyCode || !employeeId) return false;
  try {
    const cleanId = String(employeeId).trim().toUpperCase();
    const empRef = db.ref(`companies/${companyCode}/employees/${cleanId}`);
    const snapshot = await empRef.once("value");
    if (!snapshot.exists()) return false;

    await empRef.update({
      approvalEmailSentAt: Date.now(),
    });
    return true;
  } catch (error) {
    console.error(`Could not stamp approval email for ${employeeId}:`, error);
    return false;
  }
};

const getIdentityIndex = async (companyCode) => {
  const index = await buildEmployeeIdentityIndex(companyCode);
  return {
    employeeIds: Array.from(index.employeeIds),
    emails: Array.from(index.emails),
    mobiles: Array.from(index.mobiles),
  };
};

module.exports = {
  buildEmployeeIdentityIndex,
  findIdentityConflict,
  getIdentityIndex,
  createOnboardingRequest,
  createBulkOnboardingRequests,
  getOnboardingRequests,
  getOnboardingRequestById,
  submitOnboardingForm,
  approveOnboarding,
  approveOnboardingRequests,
  rejectOnboarding,
  rejectOnboardingRequests,
  getOnboardingHistory,
  markInvitationEmailSent,
  markApprovalEmailSent,
};
