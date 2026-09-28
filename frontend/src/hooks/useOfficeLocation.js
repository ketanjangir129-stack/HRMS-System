import { useEffect, useState } from "react";

import useAuth from "./useAuth";
import { getOfficeLocation } from "../services/settings/officeLocationService";

/*
|--------------------------------------------------------------------------
| Office Location
|--------------------------------------------------------------------------
| The company's configured office point, for anything that wants to hold a
| punch against it.
|
| The screens that show a punch location are handed a record and nothing
| else - no company code reaches them - so the point is fetched here rather
| than threaded down through the table and the three pages that mount it.
|
| `enabled` is what keeps that cheap. The modal passes its own open state, so
| the read happens when somebody asks to see a location and not on every
| attendance page that merely could.
|
| A failed read is not an error anybody needs to see. The office comparison
| is an addition to what the modal already shows: if the point cannot be
| loaded - no configuration, no permission, no network - the comparison is
| simply absent and everything else stays exactly as it was. Swallowing it
| here is what keeps that promise, and the console still carries the reason
| for anybody debugging it.
|--------------------------------------------------------------------------
*/

const useOfficeLocation = (enabled = true) => {

  const { company } = useAuth();

  const companyCode = company?.companyCode;

  const [office, setOffice] = useState(null);

  const [pending, setPending] = useState(true);

  /*
  | Nothing is set synchronously here: every setState waits on the read, so
  | the effect subscribes rather than cascading a render the moment it runs.
  |
  | `active` covers the modal closing mid read - a resolved promise landing
  | on an unmounted component would otherwise set state nobody is watching.
  */
  useEffect(() => {

    if (!enabled || !companyCode) return undefined;

    let active = true;

    getOfficeLocation(companyCode)
      .then((configured) => {

        if (active) setOffice(configured);

      })
      .catch((loadError) => {

        console.error("Failed to load office location:", loadError);

        if (active) setOffice(null);

      })
      .finally(() => {

        if (active) setPending(false);

      });

    return () => {
      active = false;
    };

  }, [companyCode, enabled]);

  /*
  | A read that was never started is not a read in progress. Without this a
  | caller that is disabled, or a session with no company, would report
  | loading forever.
  */
  const loading = pending && enabled && Boolean(companyCode);

  return { office, loading };

};

export default useOfficeLocation;
