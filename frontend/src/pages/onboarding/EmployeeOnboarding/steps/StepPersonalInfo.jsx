import Field from "../Field";

// Step 2: Personal Information
function StepPersonalInfo({ formData, errors, onChange }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Personal Information</h2>

      <div className="grid grid-cols-2 gap-6">
        <Field
          label="Father Name"
          name="fatherName"
          value={formData.fatherName}
          onChange={onChange}
          error={errors.fatherName}
          placeholder="Enter father's name"
          required
        />
        <Field
          label="Mother Name"
          name="motherName"
          value={formData.motherName}
          onChange={onChange}
          error={errors.motherName}
          placeholder="Enter mother's name"
          required
        />
        <Field
          label="Date of Birth"
          name="dob"
          type="date"
          value={formData.dob}
          onChange={onChange}
          error={errors.dob}
          required
        />
        <Field
          label="Gender"
          name="gender"
          as="select"
          options={["Male", "Female", "Other"]}
          value={formData.gender}
          onChange={onChange}
          error={errors.gender}
          placeholder="Select Gender"
          required
        />
        <Field
          label="Marital Status"
          name="maritalStatus"
          as="select"
          options={["Single", "Married", "Divorced", "Widowed"]}
          value={formData.maritalStatus}
          onChange={onChange}
          error={errors.maritalStatus}
          placeholder="Select Marital Status"
          required
        />
        <Field
          label="Personal Mobile Number"
          name="personalMobile"
          value={formData.personalMobile}
          onChange={onChange}
          error={errors.personalMobile}
          placeholder="10-digit mobile number"
          required
        />
        <Field
          label="Alternate Mobile Number"
          name="alternateMobile"
          value={formData.alternateMobile}
          onChange={onChange}
          error={errors.alternateMobile}
          placeholder="Optional"
        />
        <Field
          label="City"
          name="city"
          value={formData.city}
          onChange={onChange}
          error={errors.city}
          placeholder="Enter city"
          required
        />
        <Field
          label="State"
          name="state"
          value={formData.state}
          onChange={onChange}
          error={errors.state}
          placeholder="Enter state"
          required
        />
        <Field
          label="Pincode"
          name="pincode"
          value={formData.pincode}
          onChange={onChange}
          error={errors.pincode}
          placeholder="6-digit pincode"
          required
        />
        <Field
          label="Address"
          name="address"
          as="textarea"
          value={formData.address}
          onChange={onChange}
          error={errors.address}
          placeholder="Enter full address"
          required
          fullWidth
        />
      </div>
    </div>
  );
}

export default StepPersonalInfo;
