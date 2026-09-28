import Field from "../Field";

// Step 1: Basic Information (prefilled, readonly)
function StepBasicInfo({ employeeId, employmentInfo }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Employement Information</h2>
      <p className="text-sm text-gray-500 mb-6">
        These details were provided in your invitation and cannot be edited.
      </p>

      <div className="grid grid-cols-2 gap-6">
        <Field label="Employee ID" value={employeeId} readOnly />
        <Field label="Employee Name" value={employmentInfo?.name || ""} readOnly />
        <Field label="Email" value={employmentInfo?.email || ""} readOnly />
        <Field label="Mobile" value={employmentInfo?.mobile || ""} readOnly />
        <Field label="Department" value={employmentInfo?.department || ""} readOnly />
        <Field label="Designation" value={employmentInfo?.designation || ""} readOnly />
        <Field label="joiningDate" value={new Date(employmentInfo?.joiningDate).toLocaleDateString("en-gb") || ""} readOnly />
        <Field label="employeeType" value={employmentInfo?.employeeType || ""} readOnly />
      </div>
    </div>
  );
}

export default StepBasicInfo;
