import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { AlertTriangle, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";

import { auth } from "../../firebase/firebase";
import { migrateCompanyAuth } from "../../utils/migration/migrateAuth";

/*
|--------------------------------------------------------------------------
| One-time migration screen
|--------------------------------------------------------------------------
| Deliberately outside the normal login flow. Until this has run the owner has
| no /userIndex row, so loadSession cannot build a session for them and the
| ordinary login refuses the sign-in. This page therefore talks to Firebase
| Auth directly and signs out again the moment it is finished.
|
| Delete this page and its route once every company has been migrated.
|--------------------------------------------------------------------------
*/

const MigrateAuth = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    companyCode: "",
    email: "",
    password: "",
  });

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setReport(null);
    setProgress(null);
    setRunning(true);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password
      );

      const result = await migrateCompanyAuth({
        companyCode: formData.companyCode,
        ownerUid: credential.user.uid,
        onProgress: setProgress,
      });

      setReport(result);
    } catch (err) {
      console.error(err);
      setError(
        err.code === "auth/invalid-credential"
          ? "Invalid owner email or password."
          : err.message
      );
    } finally {
      // Never leave a session behind: the owner should sign in through the
      // normal login page now that they have an index row.
      await signOut(auth).catch(() => {});
      setRunning(false);
    }
  };

  const migrated = report?.results.filter((r) => r.status === "migrated") ?? [];
  const failed = report?.results.filter((r) => r.status === "failed") ?? [];
  const skipped = report?.results.filter((r) => r.status === "skipped") ?? [];
  const reset = migrated.filter((r) => r.password);

  const inputClass =
    "w-full h-12 px-4 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition";

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-200 p-8">

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-sm font-medium">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          One-time migration
        </div>

        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          Upgrade sign-in for your company
        </h1>

        <p className="mt-2 text-slate-500 leading-relaxed">
          Gives every employee a real Firebase Auth account and removes the
          passwords stored in the database. Employees keep the password they
          already use. Run this once per company — running it again is harmless.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Company Code
            </label>
            <input
              type="text"
              name="companyCode"
              value={formData.companyCode}
              onChange={handleChange}
              placeholder="ABC001"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Owner Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="owner@company.com"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Owner Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="********"
              required
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={running}
            className={`h-12 rounded-xl text-white font-medium transition ${
              running
                ? "bg-blue-500 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
            }`}
          >
            {running ? "Migrating..." : "Run migration"}
          </button>
        </form>

        {progress && running && (
          <p className="mt-4 text-sm text-slate-500">
            {progress.done} of {progress.total} employees processed…
          </p>
        )}

        {error && (
          <div className="mt-6 flex gap-3 rounded-xl bg-red-50 border border-red-200 p-4">
            <XCircle className="h-5 w-5 shrink-0 text-red-500" aria-hidden="true" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {report && (
          <div className="mt-6 grid gap-4">

            <div className="flex gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <CheckCircle2
                className="h-5 w-5 shrink-0 text-emerald-600"
                aria-hidden="true"
              />
              <div className="text-sm text-emerald-800">
                <p className="font-medium">
                  {report.companyCode} migrated.
                </p>
                <p className="mt-1">
                  {migrated.length} employee accounts created
                  {skipped.length > 0 && `, ${skipped.length} already done`}
                  {failed.length > 0 && `, ${failed.length} failed`}.
                </p>
              </div>
            </div>

            {reset.length > 0 && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                <div className="flex gap-3">
                  <AlertTriangle
                    className="h-5 w-5 shrink-0 text-amber-600"
                    aria-hidden="true"
                  />
                  <div className="text-sm text-amber-900">
                    <p className="font-medium">
                      These passwords were too short for Firebase and had to be
                      reset. Pass them on — this list is not shown again.
                    </p>

                    <ul className="mt-2 grid gap-1 font-mono text-xs">
                      {reset.map((r) => (
                        <li key={r.employeeId}>
                          {r.employeeId} — {r.password}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {failed.length > 0 && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                <p className="text-sm font-medium text-red-800">
                  Could not migrate:
                </p>

                <ul className="mt-2 grid gap-1 text-sm text-red-700">
                  {failed.map((r) => (
                    <li key={r.employeeId}>
                      <span className="font-mono">{r.employeeId}</span> — {r.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => navigate("/login")}
              className="h-12 rounded-xl border border-slate-300 font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Go to login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MigrateAuth;
