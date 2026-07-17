import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "react-router-dom";

import {
  toast,
} from "react-toastify";

import {
  getOnboardingRequestById,
  submitOnboardingForm,
} from "../../services/OnboardingService";
import Loader from "../../components/common/Loader";

function EmployeeOnboarding() {

  const {companyCode,employeeId,} = useParams();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [request, setRequest] = useState(null);

  const [formData, setFormData] = useState({
    fatherName: "",
    dob: "",
    gender: "",
    address: "",
    joiningDate: "",
  });

  useEffect(() => {

    loadRequest();

  }, []);

  const loadRequest = async () => {

    try {

      const data =
        await getOnboardingRequestById(
          companyCode,
          employeeId
        );

      setRequest(data);
      setFormData({
        fatherName: "",
        dob: "",
        gender: "",
        address: "",
        joiningDate: "",
      });

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {

    e.preventDefault();
    setSubmitting(true);
    try {

      const result =
        await submitOnboardingForm(
          companyCode,
          employeeId,
          formData
        );

      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Form submitted successfully");
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {

    return (
      <Loader text="loading" />
    );
  }

  if (!request) {

    return (
      <div className="p-10">
        Invalid invitation.
      </div>
    );
  }

  return (

    <div className="max-w-5xl mx-auto p-8 h-full">

      <div className="bg-white rounded-2xl shadow p-8">

        <h1 className="text-3xl font-bold mb-8">
          Employee Onboarding
        </h1>

        <form
          onSubmit={handleSubmit}
        >

          {/* Prefilled Details */}

          <div className="grid grid-cols-2 gap-6 mb-8">

            <input
              disabled
              value={employeeId}
              className="border p-3 rounded-lg bg-gray-100"
            />

            <input
              disabled
              value={
                request.basic.name
              }
              className="border p-3 rounded-lg bg-gray-100"
            />

            <input
              disabled
              value={
                request.basic.email
              }
              className="border p-3 rounded-lg bg-gray-100"
            />

            <input
              disabled
              value={
                request.basic.mobile
              }
              className="border p-3 rounded-lg bg-gray-100"
            />

          </div>

          {/* Employee Inputs */}

          <div className="grid grid-cols-2 gap-6">

            <input
              name="fatherName"
              placeholder="Father Name"
              value={
                formData.fatherName
              }
              onChange={
                handleChange
              }
              className="border p-3 rounded-lg"
            />

            <input
              type="date"
              name="dob"
              value={
                formData.dob
              }
              onChange={
                handleChange
              }
              className="border p-3 rounded-lg"
            />

            <select
              name="gender"
              value={
                formData.gender
              }
              onChange={
                handleChange
              }
              className="border p-3 rounded-lg"
            >
              <option value="">
                Select Gender
              </option>

              <option value="Male">
                Male
              </option>

              <option value="Female">
                Female
              </option>

            </select>

            <input
              type="date"
              name="joiningDate"
              value={
                formData.joiningDate
              }
              onChange={
                handleChange
              }
              className="border p-3 rounded-lg"
            />

            <textarea
              name="address"
              rows="4"
              placeholder="Address"
              value={
                formData.address
              }
              onChange={
                handleChange
              }
              className="col-span-2 border p-3 rounded-lg"
            />

          </div>

          <button
            type="submit"
            disabled={
              submitting
            }
            className="mt-8 bg-blue-600 text-white px-6 py-3 rounded-lg"
          >
            {
              submitting
                ? "Submitting..."
                : "Submit Form"
            }
          </button>

        </form>

      </div>

    </div>
  );
}

export default EmployeeOnboarding;