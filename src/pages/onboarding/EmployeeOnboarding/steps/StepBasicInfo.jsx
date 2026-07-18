import Field from "../Field";

// Step 1: Basic Information (prefilled, readonly)
function StepBasicInfo({ employeeId, basic }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Basic Information</h2>
      <p className="text-sm text-gray-500 mb-6">
        These details were provided in your invitation and cannot be edited.
      </p>

      <div className="grid grid-cols-2 gap-6">
        <Field label="Employee ID" value={employeeId} readOnly />
        <Field label="Employee Name" value={basic?.name || ""} readOnly />
        <Field label="Email" value={basic?.email || ""} readOnly />
        <Field label="Mobile" value={basic?.mobile || ""} readOnly />
        <Field label="Department" value={basic?.department || ""} readOnly />
        <Field label="Designation" value={basic?.designation || ""} readOnly />
      </div>
    </div>
  );
}

export default StepBasicInfo;
