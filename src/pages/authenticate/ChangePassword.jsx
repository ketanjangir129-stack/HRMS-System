import { useEffect, useState } from "react";
import useAuth from "../../hooks/useAuth";
import {
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { toast } from 'react-toastify';
import { Eye, EyeOff } from "lucide-react";
import {
  confirmOwnerPasswordReset,
  verifyOwnerResetCode,
} from "../../services/authService";
import {
  resetPasswordWithToken,
  verifyResetToken,
} from "../../services/passwordResetService";
import {
  validatePasswordChangeField,
  validatePasswordChangeForm,
} from "../../utils/validation/passwordChange";
import Loader from "../../components/common/Loader";

/*
|--------------------------------------------------------------------------
| Change Password
|--------------------------------------------------------------------------
| The one screen on which anybody sets a password, reached three ways.
|
|   1. Sent here       - a new joiner signing in for the first time on the
|                        default password, which is their employee id. They
|                        know their current password, so they are asked for it.
|
|   2. A reset link    - an employee who has forgotten theirs. The token in the
|                        address proves who they are, which is what the current
|                        password would otherwise have done.
|
|   3. Firebase's link - the owner, same as above. Their proof is an `oobCode`
|                        rather than a token of ours, because their password
|                        lives in Firebase Auth and not in our database.
|
| One screen rather than three because all three end in the same act: the same
| fields, the same rule, one write. What differs is only how the person proved
| they may do it - so that is the only thing this branches on. The current
| password field is shown in the first case and dropped in the other two, and
| `validatePasswordChangeForm` never asks about a field the form does not carry.
|
| The two link cases check their proof before drawing the form. A page that
| asks for a password, has it typed twice and only then says the link expired
| an hour ago has wasted the one thing it had to say.
|--------------------------------------------------------------------------
*/

const MODE = {
  FIRST_LOGIN: "first-login",
  EMPLOYEE_RESET: "employee-reset",
  OWNER_RESET: "owner-reset",
};

const ChangePassword = () => {

  /*
  | Which of the three this is, decided by the address alone.
  |
  | `/change-password`                                - sent here
  | `/reset-password/:companyCode/:employeeId/:token` - our link
  | `/reset-password?oobCode=...`                     - Firebase's link
  */
  const { companyCode: linkCompanyCode, employeeId, token } = useParams();

  const [searchParams] = useSearchParams();

  const oobCode = searchParams.get("oobCode");

  const mode = token
    ? MODE.EMPLOYEE_RESET
    : oobCode
      ? MODE.OWNER_RESET
      : MODE.FIRST_LOGIN;

  const isReset = mode !== MODE.FIRST_LOGIN;

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const { changePassword } = useAuth();
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});

  /*
  | The link's verdict. `null` while it is being checked, which is only ever
  | the case in the two reset modes - the first-login path never waits.
  */
  const [linkValid, setLinkValid] = useState(isReset ? null : true);
  const [linkProblem, setLinkProblem] = useState("");

  /* Whose account this is, so the page can name it. */
  const [accountLabel, setAccountLabel] = useState("");

  useEffect(() => {

    if (!isReset) return;

    let cancelled = false;

    const check = async () => {

      const result =
        mode === MODE.OWNER_RESET
          ? await verifyOwnerResetCode(oobCode)
          : await verifyResetToken(linkCompanyCode, employeeId, token);

      if (cancelled) return;

      setLinkValid(result.valid);
      setLinkProblem(result.valid ? "" : result.message);

      /* Firebase answers with an email, our own check with a username. */
      setAccountLabel(result.email || result.username || "");

    };

    check();

    return () => {
      cancelled = true;
    };

  }, [isReset, mode, oobCode, linkCompanyCode, employeeId, token]);

  /*
  | One flag per field rather than one for the form: the current password and
  | the new one are answers to different questions, and revealing the one you
  | are checking should not put the other two on screen as well.
  */
  const [visible, setVisible] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const toggleVisible = (field) =>
    setVisible((prev) => ({ ...prev, [field]: !prev[field] }));

  /*
  | Guards, and only for the first-login mode: only a signed-in HR/Employee
  | whose password is still the default may be sent here, and anybody else goes
  | to the dashboard.
  |
  | A reset link is opened by somebody with no session at all - that is the
  | whole point of it - so putting these in its way would send them to sign in,
  | which is the one thing they currently cannot do.
  */
  if (!isReset) {

    const companyCode = localStorage.getItem("companyCode");
    const role = localStorage.getItem("role");
    const storedUser = JSON.parse(localStorage.getItem("currentUser") || "null");

    if (!companyCode) {
      return <Navigate to="/login" replace />;
    }
    if (role === "owner" || storedUser?.isPasswordChanged === true) {
      return <Navigate to="/dashboard" replace />;
    }

  }

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;

    setErrors((prev) => ({
      ...prev,
      [name]: validatePasswordChangeField(name, value, formData),
    }));
  };

  /*
  | What is actually validated and submitted. In the reset modes the current
  | password is not on screen, so it is not in here either - which is what keeps
  | the validator from ever asking about it.
  */
  const submittedFields = isReset
    ? {
      newPassword: formData.newPassword,
      confirmPassword: formData.confirmPassword,
    }
    : formData;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validatePasswordChangeForm(submittedFields);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {

      /*
      | Three writes, one for each way in. The reset ones re-check their proof
      | next to the write rather than trusting the check this page made when it
      | opened: in between, a link may have expired or been used in another tab.
      */
      const result =
        mode === MODE.OWNER_RESET
          ? await confirmOwnerPasswordReset(oobCode, formData.newPassword)
          : mode === MODE.EMPLOYEE_RESET
            ? await resetPasswordWithToken(
              linkCompanyCode,
              employeeId,
              token,
              formData.newPassword
            )
            : await changePassword(
              formData.currentPassword,
              formData.newPassword
            );

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Password updated successfully");

      /*
      | After a reset there is no session to carry on into - neither kind of
      | link signs anybody in - so they go to sign in with what they have just
      | chosen, which is also the first proof that it took. Somebody sent here
      | on their first login is already signed in and simply carries on.
      */
      navigate(isReset ? "/login" : "/dashboard", { replace: isReset });

    } catch (error) {
      console.error(error);
      toast.error("Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  /* The card every state below sits in, so its shape never jumps. */
  const shell = (children) => (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-8">
        {children}
      </div>
    </div>
  );

  if (linkValid === null) {
    return shell(<Loader text="Checking your link..." />);
  }

  /*
  | A dead link. It offers the sign-in screen rather than a way to ask for
  | another from here: that dialog needs a company code and an email, and it is
  | one click away on the page this sends them to.
  */
  if (!linkValid) {
    return shell(
      <div className="text-center">

        <h1 className="text-2xl font-bold mb-3">
          Link no longer valid
        </h1>

        <p className="text-gray-500 mb-7">
          {linkProblem}
        </p>

        <button
          type="button"
          onClick={() => navigate("/login", { replace: true })}
          className="w-full py-3 rounded-lg text-white font-medium bg-blue-600 hover:bg-blue-700 transition-all duration-200 cursor-pointer"
        >
          Back to Sign In
        </button>

      </div>
    );
  }

  return shell(
    <>
        {/* header */}
        <div>
          <h1 className="text-3xl font-bold text-center mb-2">
            {isReset ? "Reset Password" : "Change Password"}
          </h1>

          <p className="text-center text-gray-500 mb-8">
            {isReset
              ? accountLabel
                ? `Choose a new password for ${accountLabel}`
                : "Choose a new password for your account"
              : "Update your password to continue"}
          </p>
        </div>
        <div>
          {/* body */}
          <form onSubmit={handleSubmit}>

            {/*
              Current Password — asked only of somebody who has one to give. On
              a reset link it is hidden, because not having it is the reason
              they are here at all.
            */}
            {!isReset && (
            <div className="mb-4">
              <label className="block mb-2 font-medium">
                Current Password
              </label>

              <div className="relative">
                <input
                  type={visible.currentPassword ? "text" : "password"}
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="********"
                  className="w-full border rounded-lg p-3 pr-12"
                />

                <button
                  type="button"
                  onClick={() => toggleVisible("currentPassword")}
                  aria-label={
                    visible.currentPassword
                      ? "Hide current password"
                      : "Show current password"
                  }
                  aria-pressed={visible.currentPassword}
                  className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center rounded-r-lg text-slate-400 transition-colors hover:text-blue-600"
                >
                  {visible.currentPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>

              {errors.currentPassword && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.currentPassword}
                </p>
              )}
            </div>
            )}

            {/* New Password */}
            <div className="mb-4">
              <label className="block mb-2 font-medium">
                New Password
              </label>

              <div className="relative">
                <input
                  type={visible.newPassword ? "text" : "password"}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="********"
                  className="w-full border rounded-lg p-3 pr-12"
                />

                <button
                  type="button"
                  onClick={() => toggleVisible("newPassword")}
                  aria-label={
                    visible.newPassword
                      ? "Hide new password"
                      : "Show new password"
                  }
                  aria-pressed={visible.newPassword}
                  className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center rounded-r-lg text-slate-400 transition-colors hover:text-blue-600"
                >
                  {visible.newPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>

              {errors.newPassword && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.newPassword}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="mb-6">
              <label className="block mb-2 font-medium">
                Confirm Password
              </label>

              <div className="relative">
                <input
                  type={visible.confirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="********"
                  className="w-full border rounded-lg p-3 pr-12"
                />

                <button
                  type="button"
                  onClick={() => toggleVisible("confirmPassword")}
                  aria-label={
                    visible.confirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  aria-pressed={visible.confirmPassword}
                  className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center rounded-r-lg text-slate-400 transition-colors hover:text-blue-600"
                >
                  {visible.confirmPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>

              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`
                  w-full py-3 rounded-lg text-white font-medium
                  transition-all duration-200
                  ${loading
                  ? "bg-blue-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
                }
              `}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">

                  <svg
                    className="w-5 h-5 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />

                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>

                  <span>Updating...</span>

                </div>
              ) : (
                "Update Password"
              )}
            </button>

          </form>
        </div>
    </>
  );
};

export default ChangePassword;
