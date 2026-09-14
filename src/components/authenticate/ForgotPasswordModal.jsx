import { useState } from "react";
import { Building2, CheckCircle2, Mail, X } from "lucide-react";

import { requestPasswordReset } from "../../services/passwordResetService";

/*
|--------------------------------------------------------------------------
| Forgot Password
|--------------------------------------------------------------------------
| Asking for a reset link, from the sign-in screen.
|
| The email address is what it asks for rather than the user id, because the
| address is the one thing every kind of account here has. An owner has no
| employee id at all; everybody else has both. Asking for the one they share
| is what lets a single dialog serve all of them.
|
| The company code is asked for as well, and only so that the search has
| somewhere to look - an address on its own would mean reading every company
| in the database. The screen behind this one already asks for it, so it is
| not a new thing to remember.
|
| Two states, not three. There is no "no account with that email": the dialog
| either could not send, or says the same sentence for an address it found and
| one it did not. Anything else would turn a screen that asks nothing of the
| visitor into a way of finding out who is registered.
|--------------------------------------------------------------------------
*/

function ForgotPasswordModal({ open, companyCode = "", onClose }) {

  /*
  | Seeded from whatever was typed on the sign-in form, so somebody who filled
  | the code in and then realised they had forgotten their password does not
  | type it again. It stays editable - they may have got it wrong, and this is
  | one of the two places that would show it.
  */
  const [formData, setFormData] = useState({
    companyCode,
    email: "",
  });

  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState("");

  /* Set once the request comes back sent; swaps the form for the receipt. */
  const [sentTo, setSentTo] = useState("");

  if (!open) return null;

  const close = () => {
    setFormData({ companyCode, email: "" });
    setErrors({});
    setFailure("");
    setSentTo("");
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setFailure("");
  };

  const validate = () => {

    const problems = {};

    if (!formData.companyCode.trim()) {
      problems.companyCode = "This field is required.";
    }

    if (!formData.email.trim()) {
      problems.email = "This field is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      problems.email = "Enter a valid email.";
    }

    return problems;

  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const problems = validate();

    if (Object.keys(problems).length > 0) {
      setErrors(problems);
      return;
    }

    setSending(true);
    setFailure("");

    try {

      const result = await requestPasswordReset(
        formData.companyCode,
        formData.email
      );

      if (!result.success) {
        setFailure(result.message);
        return;
      }

      setSentTo(formData.email.trim());

    } catch (error) {
      console.error(error);
      setFailure("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }

  };

  const inputClass = (hasError) =>
    `h-12 w-full rounded-xl border bg-white pl-11 pr-4 text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
      hasError
        ? "border-red-400 focus:border-red-500 focus:ring-red-100"
        : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">

      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">

        <div className="mb-5 flex items-start justify-between gap-3 sm:gap-4">

          <div className="flex min-w-0 items-center gap-3">

            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${
                sentTo
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-blue-50 text-blue-600"
              }`}
            >
              {sentTo ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Mail className="h-5 w-5" />
              )}
            </div>

            <div className="min-w-0">

              <h2 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                {sentTo ? "Check your email" : "Reset your password"}
              </h2>

              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                {sentTo
                  ? "The link expires in one hour."
                  : "We will email you a link to choose a new one."}
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={close}
            title="Close"
            disabled={sending}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X className="h-4 w-4" />
          </button>

        </div>

        {sentTo ? (

          <>

            <p className="text-sm leading-relaxed text-slate-600">
              If <span className="font-semibold text-slate-900">{sentTo}</span>{" "}
              has an account, a password reset link is on its way.
            </p>

            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              Nothing after a few minutes? Check your spam folder, or try again
              with a different address.
            </p>

            <div className="mt-6 flex justify-end">

              <button
                type="button"
                onClick={close}
                className="w-full cursor-pointer rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 sm:w-auto"
              >
                Back to Sign In
              </button>

            </div>

          </>

        ) : (

          <form onSubmit={handleSubmit}>

            <fieldset className="space-y-4" disabled={sending}>

              <div>

                <label
                  htmlFor="reset-company-code"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Company Code
                </label>

                <div className="relative">

                  <Building2
                    className="pointer-events-none absolute inset-y-0 left-4 my-auto h-5 w-5 text-slate-400"
                    aria-hidden="true"
                  />

                  <input
                    id="reset-company-code"
                    type="text"
                    name="companyCode"
                    value={formData.companyCode}
                    onChange={handleChange}
                    placeholder="ABC001"
                    className={inputClass(errors.companyCode)}
                  />

                </div>

                {errors.companyCode && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.companyCode}
                  </p>
                )}

              </div>

              <div>

                <label
                  htmlFor="reset-email"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Registered Email
                </label>

                <div className="relative">

                  <Mail
                    className="pointer-events-none absolute inset-y-0 left-4 my-auto h-5 w-5 text-slate-400"
                    aria-hidden="true"
                  />

                  <input
                    id="reset-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                    placeholder="you@company.com"
                    className={inputClass(errors.email)}
                  />

                </div>

                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                )}

              </div>

            </fieldset>

            {failure && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-xs leading-relaxed text-red-700 sm:text-sm">
                  {failure}
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">

              <button
                type="button"
                onClick={close}
                disabled={sending}
                className="w-full cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={sending}
                className="w-full cursor-pointer rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto"
              >
                {sending ? "Sending..." : "Send Reset Link"}
              </button>

            </div>

          </form>

        )}

      </div>

    </div>
  );

}

export default ForgotPasswordModal;
