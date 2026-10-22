import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getReimbursementClaims,
  createReimbursementClaim,
  approveReimbursementClaim,
  rejectReimbursementClaim,
} from "../services/reimbursementServices/reimbursementService";

function useReimbursements() {
  const [allClaims, setAllClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getReimbursementClaims();
        if (cancelled) return;
        setAllClaims(data);
        setError(null);
      } catch (loadError) {
        if (cancelled) return;
        setAllClaims([]);
        setError(loadError.message || "Failed to load reimbursement claims.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const claims = useMemo(
    () => [...allClaims].sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0)),
    [allClaims]
  );

  const submitClaim = useCallback(
    async (payload) => {
      const result = await createReimbursementClaim(payload);
      if (result.success) reload();
      return result;
    },
    [reload]
  );

  const approveClaim = useCallback(
    async (claim, remarks = "") => {
      const result = await approveReimbursementClaim(claim, remarks);
      if (result.success) reload();
      return result;
    },
    [reload]
  );

  const rejectClaim = useCallback(
    async (claim, reason) => {
      const result = await rejectReimbursementClaim(claim, reason);
      if (result.success) reload();
      return result;
    },
    [reload]
  );

  return { claims, loading, error, reload, submitClaim, approveClaim, rejectClaim };
}

export default useReimbursements;
