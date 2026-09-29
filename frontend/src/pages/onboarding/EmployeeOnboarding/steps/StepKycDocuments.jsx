import Field from "../Field";

const UPLOADS = [
  { name: "aadhaarCard", label: "Aadhaar Card" },
  { name: "panCard", label: "PAN Card" },
  { name: "resume", label: "Resume" },
  { name: "passportPhoto", label: "Passport Photo" },
];

// Step 4: KYC / Documents
function StepKycDocuments({ formData, errors, onChange, onFileChange }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">KYC / Documents</h2>

      <div className="grid grid-cols-2 gap-6">
        <Field
          label="Aadhaar Number"
          name="aadhaarNumber"
          value={formData.aadhaarNumber}
          onChange={onChange}
          error={errors.aadhaarNumber}
          placeholder="12-digit Aadhaar number"
          required
        />
        <Field
          label="PAN Number"
          name="panNumber"
          value={formData.panNumber}
          onChange={onChange}
          error={errors.panNumber}
          placeholder="e.g. ABCDE1234F"
          required
        />
        <Field
          label="UAN Number"
          name="uanNumber"
          value={formData.uanNumber}
          onChange={onChange}
          error={errors.uanNumber}
          placeholder="Optional"
        />
        <Field
          label="ESIC Number"
          name="esicNumber"
          value={formData.esicNumber}
          onChange={onChange}
          error={errors.esicNumber}
          placeholder="Optional"
        />
      </div>

      <h3 className="text-sm font-semibold text-gray-700 mt-8 mb-4">
        Document Uploads{" "}
        <span className="font-normal text-gray-400">(optional)</span>
      </h3>

      <div className="grid grid-cols-2 gap-6">
        {UPLOADS.map((u) => (
          <div key={u.name}>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              {u.label}
            </label>
            <input
              type="file"
              name={u.name}
              onChange={onFileChange}
              className="border border-gray-300 p-2.5 rounded-lg w-full text-sm file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-600 file:cursor-pointer"
            />
            {formData.files?.[u.name] && (
              <p className="mt-1 text-xs text-gray-500">
                {formData.files[u.name].name}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default StepKycDocuments;
