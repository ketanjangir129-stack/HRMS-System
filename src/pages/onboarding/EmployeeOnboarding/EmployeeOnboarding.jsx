import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

import {
  getOnboardingRequestById,
  submitOnboardingForm,
} from "../../../services/OnboardingService";
import Loader from "../../../components/common/Loader";

import Stepper from "./Stepper";
import { validateStep } from "./validation";
import StepBasicInfo from "./steps/StepBasicInfo";
import StepPersonalInfo from "./steps/StepPersonalInfo";
import StepBankDetails from "./steps/StepBankDetails";
import StepKycDocuments from "./steps/StepKycDocuments";

const TOTAL_STEPS = 4;

const initialFormData = {
  // Personal
  fatherName: "",
  motherName: "",
  dob: "",
  gender: "",
  maritalStatus: "",
  personalMobile: "",
  alternateMobile: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  // Bank
  accountHolderName: "",
  bankName: "",
  accountNumber: "",
  confirmAccountNumber: "",
  ifscCode: "",
  branchName: "",
  // KYC
  aadhaarNumber: "",
  panNumber: "",
  uanNumber: "",
  esicNumber: "",
  // Preserved for the existing service mapping (employment.joiningDate)
  joiningDate: "",
  // Optional document uploads
  files: {},
};

function EmployeeOnboarding() {
  const { companyCode, employeeId } = useParams();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [request, setRequest] = useState(null);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});

  const loadRequest = async () => {
    try {
      const data = await getOnboardingRequestById(companyCode, employeeId);
      setRequest(data);
      setFormData(initialFormData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRequest();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear the error for this field as the user corrects it.
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      files: { ...prev.files, [name]: files[0] || null },
    }));
  };

  const handleNext = () => {
    const stepErrors = validateStep(step, formData);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      toast.error("Please fill all required fields correctly");
      return;
    }
    setErrors({});
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  };

  const handleBack = () => {
    setErrors({});
    setStep((prev) => Math.max(prev - 1, 1));
  };

  // Only allow jumping to a previous (already completed) step.
  const handleStepClick = (target) => {
    if (target < step) {
      setErrors({});
      setStep(target);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Final validation of the last step before submitting.
    const stepErrors = validateStep(step, formData);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      toast.error("Please fill all required fields correctly");
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitOnboardingForm(
        companyCode,
        employeeId,
        formData
      );

      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Form submitted successfully");
      await loadRequest();
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen">
        <Loader text="Loading"/>
      </div>
  );
  }

  if (!request) {
    return <div className="p-10 flex justify-center items-center text-md font-bold h-screen">Invalid invitation.</div>;
  }

  if (request.status === "Pending Approval") {
    return (
      <div className="max-w-3xl mx-auto mt-20">
        <div className="bg-white rounded-2xl shadow p-10 text-center">

          <h2 className="text-2xl font-bold text-green-600">
            Request Submitted
          </h2>

          <p className="mt-4 text-slate-600">
            Your onboarding information has been
            submitted successfully.
          </p>

          <p className="mt-2 text-slate-500">
            HR team is reviewing your details.
            You will receive further communication
            once the review is completed.
          </p>

        </div>
      </div>
    );
  }
  if (request.status === "Approved") {
    return (
      <div className="max-w-3xl mx-auto mt-20">
        <div className="bg-white rounded-2xl shadow p-10 text-center">

          <h2 className="text-2xl font-bold text-green-600">
            Employee Onboarded Successfully
          </h2>

          <p className="mt-4 text-slate-600">
            Your onboarding process has been completed.
          </p>

        </div>
      </div>
    );
  }


  return (
    <div className="max-w-5xl mx-auto p-8 h-full">
      <div className="bg-white rounded-2xl shadow p-8">
        <h1 className="text-3xl font-bold mb-8">Employee Onboarding</h1>

        <Stepper step={step} onStepClick={handleStepClick} />

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <StepBasicInfo
              employeeId={employeeId}
              employmentInfo={request.employmentInfo}
            />
          )}

          {step === 2 && (
            <StepPersonalInfo
              formData={formData}
              errors={errors}
              onChange={handleChange}
            />
          )}

          {step === 3 && (
            <StepBankDetails
              formData={formData}
              errors={errors}
              onChange={handleChange}
            />
          )}

          {step === 4 && (
            <StepKycDocuments
              formData={formData}
              errors={errors}
              onChange={handleChange}
              onFileChange={handleFileChange}
            />
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-10 pt-6 border-t border-gray-100">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                Back
              </button>
            ) : (
              <span />
            )}

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={handleNext}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default EmployeeOnboarding;
