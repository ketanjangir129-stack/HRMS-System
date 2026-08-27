import { useContext } from "react";
import { ManagerScopeContext } from "../context/ManagerScopeContext";

/*
|--------------------------------------------------------------------------
| Manager Scope
|--------------------------------------------------------------------------
| Whose records the signed in user may see and decide.
|
| The company code, the role and the employee id are all resolved by the
| provider from the existing authentication, so a caller asks with a row and
| nothing else:
|
|   const { canReview, filterRows, isScoped } = useManagerScope();
|
|   filterRows(records)     the rows this user may see
|   canReview(record)       whether the approve and reject buttons belong
|
| Both answer true for an owner and for HR without reading anything, so a page
| can narrow itself unconditionally rather than branching on the role first.
|
| `loading` says the answer is not final yet. A screen that decides an
| approval should wait for it: rendering the buttons first and pulling them
| away a moment later would offer a decision the user is not entitled to make.
|--------------------------------------------------------------------------
*/

const useManagerScope = () => {

  const context = useContext(ManagerScopeContext);

  if (!context) {
    throw new Error(
      "useManagerScope must be used within a ManagerScopeProvider"
    );
  }

  return context;

};

export default useManagerScope;
