import { useEffect, useState } from "react";
import { FiInfo, FiLock } from "react-icons/fi";
import { MdOutlinePolicy } from "react-icons/md";
import { toast } from "react-toastify";
import {
  getHRPolicy,
  updateESIPolicy,
  updatePFPolicy,
} from "../../services/settings/hrPolicyService";
import ESIPolicyCard from "../../components/hrPolicy/ESIPolicyCard";
import PFPolicyCard from "../../components/hrPolicy/PFPolicyCard";
import Loader from "../../components/common/Loader";
import useRoleAccess from "../../hooks/useRoleAccess";

/*
|--------------------------------------------------------------------------
| HR Policy
|--------------------------------------------------------------------------
| The company's statutory deduction rules, in one place: whether PF and ESI
| are deducted at all, at what rate, and on what.
|
| This is a policy screen, not a salary screen. Nothing typed here changes an
| assigned structure by itself - it is the rule the payslips are priced
| against, so it is set once for the company rather than per employee.
|
| The page is the container only. It reads the stored policies, holds them,
| and writes back whichever card was saved; the fields, the rules behind them
| and the drafts being typed belong to the cards under `components/hrPolicy`.
|
| Each policy is saved on its own. `hrPolicy.pf` and `hrPolicy.esi` decide
| which cards a role is shown, and `hrPolicy.update` whether it may change
| them - a role without it still reads the rates, which is what somebody who
| has to answer "what is our PF set to" actually needs.
|--------------------------------------------------------------------------
*/

function HRPolicy() {

  const companyCode = localStorage.getItem("companyCode");

  const { canAccessSection } = useRoleAccess();

  const canViewPF = canAccessSection("hrPolicy.pf");
  const canViewESI = canAccessSection("hrPolicy.esi");
  const canUpdate = canAccessSection("hrPolicy.update");

  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");

  useEffect(() => {

    let cancelled = false;

    const load = async () => {

      setLoading(true);

      try {

        const stored = await getHRPolicy(companyCode);

        if (!cancelled) {
          setPolicy(stored);
        }

      }

      catch (error) {

        console.error(error);

        if (!cancelled) {
          /*
          | The read already falls back to the defaults for a company that has
          | nothing stored, so getting here means the branch could not be read
          | at all. The screen says so rather than presenting the defaults as
          | if they were this company's policy.
          */
          setPolicy(null);
          toast.error(error.message || "Could not load HR policies.");
        }

      }

      finally {

        if (!cancelled) {
          setLoading(false);
        }

      }

    };

    load();

    return () => {
      cancelled = true;
    };

  }, [companyCode]);

  /*
  | One save handler for both cards. The only differences are which service
  | call is made and which branch of the held policy the saved record replaces,
  | so both are passed in rather than written twice.
  */
  const savePolicy = async ({ key, label, save, draft }) => {

    if (!canUpdate) {
      toast.error("You are not allowed to change HR policies.");
      return;
    }

    setSaving(key);

    try {

      const result = await save(companyCode, draft);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      /*
      | Only the saved branch is replaced. Handing the other card a new object
      | would re-seed a draft somebody is part way through typing.
      */
      setPolicy((previous) => ({
        ...previous,
        [key]: result.policy,
      }));

      toast.success(`${label} policy saved.`);

    }

    catch (error) {

      console.error(error);

      toast.error(error.message || `Could not save the ${label} policy.`);

    }

    finally {

      setSaving("");

    }

  };

  if (loading) {
    return (
      <div className="h-full w-full p-8">
        <Loader text="Loading HR policies..." />
      </div>
    );
  }

  return (

    <div className="mx-auto max-w-[1600px] space-y-4 p-0 sm:space-y-6 sm:p-2">

      {/* Heading */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">

        <div className="flex min-w-0 items-center gap-3 sm:gap-4">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-lg text-white shadow-sm shadow-blue-600/20 sm:h-12 sm:w-12 sm:text-xl">
            <MdOutlinePolicy />
          </div>

          <div className="min-w-0">

            <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-3xl">
              HR Policy
            </h1>

            <p className="mt-0.5 text-xs text-slate-500 sm:mt-1 sm:text-base">
              Statutory deductions applied to your company's salaries.
            </p>

          </div>

        </div>

      </div>

      {/*
      | A role with the page but neither policy on it. The page is still
      | reachable, so it says why it is empty instead of rendering nothing.
      */}
      {!canViewPF && !canViewESI && (

        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <FiLock size={24} />
          </div>

          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            Nothing to show here yet
          </h2>

          <p className="mt-1 max-w-md text-sm text-slate-500">
            Your role does not include the PF or ESI policy. Contact the
            account owner if you need either of them enabled.
          </p>

        </div>

      )}

      {/*
      | A policy the database could not be read for. Showing the cards on the
      | defaults would present them as this company's configuration, and saving
      | one would then write a rate nobody chose.
      */}
      {policy === null && (canViewPF || canViewESI) && (

        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <FiInfo size={24} />
          </div>

          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            HR policies could not be loaded
          </h2>

          <p className="mt-1 max-w-md text-sm text-slate-500">
            Check your connection and refresh the page to try again.
          </p>

        </div>

      )}

      {policy !== null && (

        <div className="space-y-4 sm:space-y-6">

          {canViewPF && (

            <PFPolicyCard
              policy={policy.pf}
              saving={saving === "pf"}
              readOnly={!canUpdate}
              onSave={(draft) =>
                savePolicy({
                  key: "pf",
                  label: "PF",
                  save: updatePFPolicy,
                  draft,
                })
              }
            />

          )}

          {canViewESI && (

            <ESIPolicyCard
              policy={policy.esi}
              saving={saving === "esi"}
              readOnly={!canUpdate}
              onSave={(draft) =>
                savePolicy({
                  key: "esi",
                  label: "ESI",
                  save: updateESIPolicy,
                  draft,
                })
              }
            />

          )}

        </div>

      )}

    </div>

  );

}

export default HRPolicy;
