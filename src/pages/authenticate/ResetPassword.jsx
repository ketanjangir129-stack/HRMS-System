import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
} from "lucide-react";

import Loader from "../../components/common/Loader";
import {
  resetPasswordWithToken,
  verifyResetToken,
} from "../../services/passwordResetService";
import {
  validatePasswordChangeField,
  validatePasswordChangeForm,
} from "../../utils/validation/passwordChange";

/*
|--------------------------------------------------------------------------
| Reset Password
|--------------------------------------------------------------------------
| What the link in a reset email opens.
|
| Unguarded, like the onboarding form, and for the same reason: somebody
| arriving here has no session and cannot get one - the password that would
| buy them one is the thing they have come to replace. The link is what
| stands in for signing in, so the first thing this page does is check it.
|
| That check happens before the form is drawn rather than on submit. A page
| that asks for a password, has it typed twice, and only then says the link
| expired an hour ago has wasted the one thing it had to tell them.
|
| No current password is asked for. The whole premise is that they do not
| have it, and `validatePasswordChangeForm` simply never asks about a field
| the form does not carry.
|--------------------------------------------------------------------------
*/

const EMPTY_FORM = {
  newPassword: "",
  confirmPassword: "",
};

const FIELDS = [
  { name: "newPassword", label: "New Password" },
  { name: "confirmPassword", label: "Confirm New Password" },
];

const ResetPassword = () => {

  const { companyCode, employeeId, token } = useParams();

  const navigate = useNavigate();

  /* null while the link is being checked, then true or false. */
  const [linkValid, setLinkValid] = useState(null);

  const [linkProblem, setLinkProblem] = useState("");
  const [username, setUsername] = useState("");

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState("");
  const [done, setDone] = useState(false);

  /*
  | One toggle for both fields. Somebody who wants to see what they are typing
  | wants to see all of it, and a per-field eye on a form whose point is that
  | the two must match is two ways to ask one question.
  */
  const [visible, setVisible] = useState(false);

  useEffect(() => {

    let cancelled = false;

    const check = async () => {

      const result = await verifyResetToken(companyCode, employeeId, token);

      if (cancelled) return;

      setLinkValid(result.valid);
      setLinkProblem(result.valid ? "" : result.message);
      setUsername(result.username || "");

    };

    check();

    return () => {
      cancelled = true;
    };

  }, [companyCode, employeeId, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));
    setFailure("");
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;

    setErrors((prev) => ({
      ...prev,
      [name]: validatePasswordChangeField(name, value, formData),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const problems = validatePasswordChangeForm(formData);

    if (Object.keys(problems).length > 0) {
      setErrors(problems);
      return;
    }

    setSaving(true);
    setFailure("");

    try {

      const result = await resetPasswordWithToken(
        companyCode,
        employeeId,
        token,
        formData.newPassword
      );

      /*
      | The link is re-checked next to the write, so a failure here is most
      | often a link that expired or was used in another tab while this one
      | sat open. Shown in place rather than as a toast: it decides whether
      | there is any point filling the form in again.
      */
      if (!result.success) {
        setFailure(result.message);
        return;
      }

      setDone(true);

    } catch (error) {
      console.error(error);
      setFailure("Failed to update your password. Please try again.");
    } finally {
      setSaving(false);
    }

  };

  /*
  | The shell every state below sits in, so the card does not change shape
  | between checking the link, filling the form, and being finished.
  */
  const shell = (children) => (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4 sm:p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
        {children}
      </div>
    </div>
  );

  if (linkValid === null) {
    return shell(<Loader text="Checking your link..." />);
  }

  /*
  | A dead link. It offers the sign-in screen rather than a way to ask for
  | another from here: the request needs a company code and an email, and that
  | dialog already exists one click away.
  */
  if (!linkValid) {
    return shell(
      <div className="text-center">

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <h1 className="mt-5 text-2xl font-bold text-slate-900">
          Link no longer valid
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          {linkProblem}
        </p>

        <button
          type="button"
          onClick={() => navigate("/login", { replace: true })}
          className="mt-7 w-full cursor-pointer rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0"
        >
          Back to Sign In
        </button>

      </div>
    );
  }

  if (done) {
    return shell(
      <div className="text-center">

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>

        <h1 className="mt-5 text-2xl font-bold text-slate-900">
          Password updated
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          You can now sign in with your new password.
        </p>

        <button
          type="button"
          onClick={() => {
            toast.success("Password updated successfully");
            navigate("/login", { replace: true });
          }}
          className="mt-7 w-full cursor-pointer rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0"
        >
          Go to Sign In
        </button>

      </div>
    );
  }

  return shell(
    <>

      <div className="text-center">

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Lock className="h-6 w-6" />
        </div>

        <h1 className="mt-5 text-2xl font-bold text-slate-900">
          Choose a new password
        </h1>

        {/*
        | Whose account this is, so somebody who has more than one - or who was
        | forwarded the link - can see it before they set a password on it.
        */}
        <p className="mt-2 text-sm text-slate-500">
          for <span className="font-semibold text-slate-700">{username}</span>
          {" · "}
          {companyCode}
        </p>

      </div>

      <form onSubmit={handleSubmit} className="mt-7">

        <fieldset className="space-y-4" disabled={saving}>

          {FIELDS.map((field) => (

            <div key={field.name}>

              <label
                htmlFor={field.name}
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                {field.label}
              </label>

              <div className="relative">

                <Lock
                  className="pointer-events-none absolute inset-y-0 left-4 my-auto h-5 w-5 text-slate-400"
                  aria-hidden="true"
                />

                <input
                  id={field.name}
                  type={visible ? "text" : "password"}
                  name={field.name}
                  value={formData[field.name]}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="new-password"
                  placeholder="********"
                  className={`h-12 w-full rounded-xl border bg-white pl-11 pr-12 text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
                    errors[field.name]
                      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                      : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
                  }`}
                />

                <button
                  type="button"
                  onClick={() => setVisible((shown) => !shown)}
                  aria-label={visible ? "Hide passwords" : "Show passwords"}
                  aria-pressed={visible}
                  className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center rounded-r-xl text-slate-400 transition-colors hover:text-blue-600"
                >
                  {visible ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>

              </div>

              {errors[field.name] && (
                <p className="mt-1 text-sm text-red-500">
                  {errors[field.name]}
                </p>
              )}

            </div>

          ))}

        </fieldset>

        {failure && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs leading-relaxed text-red-700 sm:text-sm">
              {failure}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-6 w-full cursor-pointer rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {saving ? "Updating..." : "Update Password"}
        </button>

      </form>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        This link works once and expires in an hour.
      </p>

    </>
  );

};

export default ResetPassword;
