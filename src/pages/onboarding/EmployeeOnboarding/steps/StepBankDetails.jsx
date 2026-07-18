import Field from "../Field";

// Step 3: Bank Details
function StepBankDetails({ formData, errors, onChange }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Bank Details</h2>

      <div className="grid grid-cols-2 gap-6">
        <Field
          label="Account Holder Name"
          name="accountHolderName"
          value={formData.accountHolderName}
          onChange={onChange}
          error={errors.accountHolderName}
          placeholder="As per bank records"
          required
        />
        <Field
          label="Bank Name"
          name="bankName"
          value={formData.bankName}
          onChange={onChange}
          error={errors.bankName}
          placeholder="Enter bank name"
          required
        />
        <Field
          label="Account Number"
          name="accountNumber"
          value={formData.accountNumber}
          onChange={onChange}
          error={errors.accountNumber}
          placeholder="Enter account number"
          required
        />
        <Field
          label="Confirm Account Number"
          name="confirmAccountNumber"
          value={formData.confirmAccountNumber}
          onChange={onChange}
          error={errors.confirmAccountNumber}
          placeholder="Re-enter account number"
          required
        />
        <Field
          label="IFSC Code"
          name="ifscCode"
          value={formData.ifscCode}
          onChange={onChange}
          error={errors.ifscCode}
          placeholder="e.g. HDFC0001234"
          required
        />
        <Field
          label="Branch Name"
          name="branchName"
          value={formData.branchName}
          onChange={onChange}
          error={errors.branchName}
          placeholder="Enter branch name"
          required
        />
      </div>
    </div>
  );
}

export default StepBankDetails;
