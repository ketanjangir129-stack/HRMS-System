import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import { ArrowLeft, Loader2, Mail, Printer } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { useResignation } from "../../hooks/useResignations";

import Loader from "../../components/common/Loader";
import NoAccess from "../../components/common/NoAccess";

import { resendNoc } from "../../services/resignation/resignationService";

import { RESIGNATION_STATUS } from "../../utils/resignation/resignationConstants";

import {
  canViewResignation,
  formatDate,
  formatDateTime,
  toDateKey,
} from "../../utils/resignation/resignationUtils";

import { formatCurrency } from "../../utils/salary/formatCurrency";

import { ROLE } from "../../utils/attendance/attendanceConstants";

import styles from "./NoObjectionCertificate.module.css";

/*
|--------------------------------------------------------------------------
| No Objection Certificate
|--------------------------------------------------------------------------
| The document an exit ends with, and the one thing from this module a
| former employee will actually be asked for again.
|
| It exists as a page rather than only as an email because a certificate has
| to be producible on demand: an email is a copy somebody may have lost, and
| this is the original. It is printable to PDF, and the layout answers a
| printer rather than a browser — see the stylesheet beside this file.
|
| It renders only for a resignation that has actually exited. A certificate
| for a settlement that has not been approved would be a document asserting
| something untrue, and the address is guessable, so it is refused here
| rather than trusted to nobody trying.
|--------------------------------------------------------------------------
*/

function NoObjectionCertificate() {

  const { resignationId } = useParams();

  const navigate = useNavigate();

  const { company } = useAuth();

  const {
    resignation,
    loading,
    error,
    reload,
    companyCode,
    role,
    employeeId,
    scope,
  } = useResignation(resignationId);

  const [sending, setSending] = useState(false);

  /*
  | The print dialog offers the document title as the filename, so it is
  | swapped for the length of the dialog and put back afterwards. The same
  | thing the payslip does, and for the same reason: "NOC - Priya Sharma.pdf"
  | is a file somebody can find again, "HRMS.pdf" is not.
  */
  const handlePrint = () => {

    const originalTitle = document.title;

    const restoreTitle = () => {
      document.title = originalTitle;
    };

    document.title = `NOC - ${resignation?.name || resignation?.employeeId}`;

    window.addEventListener("afterprint", restoreTitle, { once: true });

    window.print();

    /* Safari never fires `afterprint`, and `print()` blocks there, so this
       runs only once the dialog has already closed. */
    restoreTitle();

    window.removeEventListener("afterprint", restoreTitle);

  };

  const handleResend = async () => {

    setSending(true);

    try {

      const result = await resendNoc(companyCode, resignationId);

      if (result.success) {
        toast.success(result.message);
        reload();
      } else {
        toast.error(result.message || "The certificate could not be sent.");
      }

    } catch (sendError) {

      console.error("Failed to re-send the certificate:", sendError);

      toast.error("The certificate could not be sent. Please try again.");

    } finally {

      setSending(false);

    }

  };

  if (loading) {
    return (
      <div className="p-2">
        <div className="ui-card px-6 py-10">
          <Loader text="Loading the certificate..." />
        </div>
      </div>
    );
  }

  if (error || !resignation) {
    return (
      <NoAccess
        title="This certificate could not be opened"
        message={error || "The resignation it belongs to no longer exists."}
        fallbackPath="/resignation"
      />
    );
  }

  if (!canViewResignation(resignation, { role, employeeId, scope })) {
    return (
      <NoAccess
        title="This is not your certificate"
        message="You can only open the exit certificate for your own resignation."
        fallbackPath="/resignation"
      />
    );
  }

  if (resignation.status !== RESIGNATION_STATUS.EXITED) {
    return (
      <NoAccess
        title="This certificate has not been issued yet"
        message="The No Objection Certificate is issued once the full & final settlement has been approved."
        fallbackPath="/resignation"
      />
    );
  }

  const totals = resignation.fnf?.totals || {};

  const netPayable = Number(totals.netPayable) || 0;

  const companyName = company?.companyName || "The Company";

  /* Only HR and the owner may re-send it, and only they should see the
     button — an employee re-sending their own certificate to an address they
     do not control is not a thing to offer. */
  const canResend = role === ROLE.OWNER || role === ROLE.HR;

  return (

    <div className={styles.page}>

      <div className={styles.frame}>

        {/* Toolbar — dropped by the print rules in the stylesheet */}
        <div className="ui-card mb-5 flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">

          <button
            type="button"
            onClick={() => navigate("/resignation")}
            className="ui-btn ui-btn-ghost self-start font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex flex-wrap items-center gap-2.5">

            {resignation.nocIssuedAt && (
              <span className="text-xs text-ink-faint">
                Emailed {formatDateTime(resignation.nocIssuedAt)}
                {resignation.nocSentTo ? ` to ${resignation.nocSentTo}` : ""}
              </span>
            )}

            {canResend && (
              <button
                type="button"
                onClick={handleResend}
                disabled={sending}
                className="ui-btn ui-btn-secondary font-semibold"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Re-send by Email
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="ui-btn ui-btn-primary font-semibold"
            >
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </button>

          </div>

        </div>

        {/* The document */}
        <article className={styles.sheet}>

          <header className={styles.header}>

            <h1 className={styles.companyName}>{companyName}</h1>

            <p className={styles.companyMeta}>
              {[company?.address, company?.email, company?.mobile]
                .filter(Boolean)
                .join("  ·  ")}
            </p>

          </header>

          <div className={styles.body}>

            <h2 className={styles.docTitle}>No Objection Certificate</h2>

            <div className={styles.rule} />

            <div className={styles.reference}>

              <span>
                Ref: {resignation.resignationId}
              </span>

              <span>
                Date of Issue: {formatDate(
                  toDateKey(
                    new Date(resignation.nocIssuedAt || resignation.exitedAt)
                  )
                )}
              </span>

            </div>

            <p className={styles.paragraph}>
              This is to certify that{" "}
              <span className={styles.strong}>{resignation.name}</span>
              {resignation.employeeId
                ? ` (Employee ID ${resignation.employeeId})`
                : ""}{" "}
              was employed with {companyName}
              {resignation.designation
                ? ` as ${resignation.designation}`
                : ""}
              {resignation.department
                ? ` in the ${resignation.department} department`
                : ""}
              {resignation.joiningDate
                ? ` from ${formatDate(resignation.joiningDate)}`
                : ""}{" "}
              and was relieved from their duties with effect from the close of
              business on{" "}
              <span className={styles.strong}>
                {formatDate(resignation.lastWorkingDay)}
              </span>
              .
            </p>

            <table className={styles.details}>

              <tbody>

                <tr>
                  <th scope="row">Employee Name</th>
                  <td>{resignation.name || "—"}</td>
                </tr>

                <tr>
                  <th scope="row">Employee ID</th>
                  <td>{resignation.employeeId || "—"}</td>
                </tr>

                <tr>
                  <th scope="row">Designation</th>
                  <td>{resignation.designation || "—"}</td>
                </tr>

                <tr>
                  <th scope="row">Department</th>
                  <td>{resignation.department || "—"}</td>
                </tr>

                <tr>
                  <th scope="row">Date of Joining</th>
                  <td>{formatDate(resignation.joiningDate)}</td>
                </tr>

                <tr>
                  <th scope="row">Last Working Day</th>
                  <td>{formatDate(resignation.lastWorkingDay)}</td>
                </tr>

                <tr>
                  <th scope="row">
                    {netPayable < 0
                      ? "Amount Recovered"
                      : "Full & Final Settlement"}
                  </th>
                  <td>{formatCurrency(Math.abs(netPayable))}</td>
                </tr>

              </tbody>

            </table>

            <p className={styles.paragraph}>
              Their resignation was accepted in accordance with company policy
              and all formalities relating to the exit, including the return of
              company property and the full and final settlement of accounts,
              have been completed. No dues remain outstanding between{" "}
              {companyName} and the employee.
            </p>

            <p className={styles.paragraph}>
              {companyName} has{" "}
              <span className={styles.strong}>no objection</span> to their
              taking up employment elsewhere. This certificate is issued at the
              request of the employee for whatever purpose it may serve them.
            </p>

            <div className={styles.signature}>

              <div className={styles.signatureBlock}>

                <div className={styles.signatureLine} />

                <p className={styles.signatureLabel}>
                  {resignation.financeApproval?.byName || "Authorised Signatory"}
                </p>

                <p className={styles.signatureMeta}>
                  For {companyName}
                </p>

              </div>

              <div className={styles.signatureBlock}>

                <div className={styles.signatureLine} />

                <p className={styles.signatureLabel}>
                  {resignation.hrReview?.byName || "Human Resources"}
                </p>

                <p className={styles.signatureMeta}>
                  Human Resources
                </p>

              </div>

            </div>

          </div>

          <footer className={styles.footer}>
            This certificate is generated electronically by the {companyName} HR
            system and is valid without a physical signature. Its authenticity
            may be verified against reference {resignation.resignationId}.
          </footer>

        </article>

      </div>

    </div>

  );

}

export default NoObjectionCertificate;
