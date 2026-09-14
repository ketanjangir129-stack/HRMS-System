import { db } from "../firebase/firebase";
import {
  ref,
  get,
  push,
  update,
  query,
  orderByChild,
  limitToLast,
} from "firebase/database";

import { getDepartments } from "./departmentService";
import {
  IMPORT_BATCH_SIZE,
  IMPORT_STATUS,
} from "../utils/departments/departmentImportConstants";
import {
  buildDepartmentIndex,
  reconcilePlan,
} from "../utils/departments/departmentImportValidation";

/*
|--------------------------------------------------------------------------
| Department Import Service
|--------------------------------------------------------------------------
| The database half of the department importer: what gets written, and the
| note left behind saying a run happened.
|
| It writes into the branch `departmentService` owns, at the same paths and in
| the same shape:
|
|   companies/{companyCode}/departments/{departmentId}
|     { name, createdAt, designations: { {designationId}: { name } } }
|
| There is no separate tree for imported departments and deliberately no second
| record shape. An imported department is a department: the employee form's
| pickers, the manager assignment, the department scope a manager's approvals
| are narrowed by and every report grouped by department all read that path,
| and a parallel branch would be invisible to every one of them.
|
| It reads nothing of its own. The existing structure is read once by the
| wizard through `departmentService.getDepartments`, which is the same read the
| Departments screen already does, so there is no second way of asking what
| departments a company has.
|
| Every write here is additive. Nothing in this file removes a department, a
| designation or a manager, and nothing renames one - see the note in
| `departmentImportConstants` for why a Replace mode does not exist.
|--------------------------------------------------------------------------
*/

const departmentsPath = (companyCode) =>
  `companies/${companyCode}/departments`;

/*
| The history lives outside the departments node rather than under it, and this
| is not a stylistic choice.
|
| `subscribeDepartments` reads `companies/{code}/departments` whole and hands
| every child to the Departments screen as a department. A sibling called
| `imports` under that node would be rendered as a department with no name, and
| would reach `department.name.trim()` in the duplicate check the Add
| Department form runs. The attendance importer can keep its history beside its
| records because nothing enumerates the attendance node; this one cannot.
*/

const importsPath = (companyCode) =>
  `companies/${companyCode}/imports/departments`;

/*
|--------------------------------------------------------------------------
| Errors
|--------------------------------------------------------------------------
| A raw Firebase error reads as "PERMISSION_DENIED: Permission denied", which
| is not something to put in front of somebody importing an organisation chart.
| The known ones are named and everything else falls back to the caller's
| message, with the original left in the console.
|
| The same shape the attendance importer and `holidayService` use.
*/

const describeError = (error, fallback) => {

  const code = String(error?.code || error?.message || "").toLowerCase();

  if (code.includes("permission_denied")) {
    return "You do not have permission to import departments for this company.";
  }

  if (
    code.includes("network") ||
    code.includes("unavailable") ||
    code.includes("disconnected") ||
    code.includes("timeout")
  ) {
    return "Network error. Check your connection and try again.";
  }

  if (code.includes("max_write_size") || code.includes("too large")) {
    return "This batch was too large for a single write. Try importing fewer departments at a time.";
  }

  return fallback;

};

const failWith = (error, context, fallback) => {

  console.error(`${context}:`, error);

  return new Error(describeError(error, fallback));

};

/*
|--------------------------------------------------------------------------
| Import Ids
|--------------------------------------------------------------------------
| A push key carries the millisecond it was made in plus a random component, so
| two people importing in the same instant cannot collide. Prefixed the way the
| attendance importer's ids are, so an id says what it belongs to on sight.
*/

export const generateImportId = (companyCode) => {

  const key = push(ref(db, importsPath(companyCode))).key;

  return `DEPT_IMPORT_${key}`;

};

/*
|--------------------------------------------------------------------------
| Batching
|--------------------------------------------------------------------------
| The plan is written a batch at a time, and a batch is a whole number of
| departments. That is the one rule this file cannot bend.
|
| A multi location update is atomic, so everything inside one batch either
| lands or does not. Splitting a department across two batches would break
| that: the batch carrying its designations could land while the batch carrying
| the department itself failed, and Firebase creates the parent implicitly -
| leaving a department node holding designations and no `name`. The Departments
| screen would render it as a nameless card, and the duplicate check the Add
| Department form runs calls `.trim()` on that missing name.
|
| So departments are accumulated until the next one would take the batch past
| `IMPORT_BATCH_SIZE` nodes, and a department larger than that on its own gets
| a batch to itself rather than being cut in half. A normal organisation chart
| is one batch either way; the rule exists for the file that is not normal.
*/

const countEntryNodes = (entry) =>
  (entry.isNew ? 1 : 0) + entry.designations.length;

const batchByDepartment = (plan = [], size = IMPORT_BATCH_SIZE) => {

  const batches = [];

  let current = [];

  let nodes = 0;

  plan.forEach((entry) => {

    const entryNodes = countEntryNodes(entry);

    if (current.length > 0 && nodes + entryNodes > size) {
      batches.push(current);
      current = [];
      nodes = 0;
    }

    current.push(entry);

    nodes += entryNodes;

  });

  if (current.length > 0) {
    batches.push(current);
  }

  return batches;

};

/*
|--------------------------------------------------------------------------
| The Update
|--------------------------------------------------------------------------
| One department becomes either one path or several, and which it is depends
| entirely on whether it already exists.
|
| A new department is written as a single path holding the whole node - its
| name, when it was created, and every designation this import gives it. It has
| to be one path: a multi location update cannot carry both a parent and a
| child of that parent, so writing the department and then its designations as
| separate paths in the same update is rejected outright by the database.
|
| An existing department is the opposite case. Its node must not be touched -
| it has a name, a `createdAt`, a manager and designations this import knows
| nothing about - so each new designation is its own leaf path underneath it,
| and everything already there is left exactly as it is.
|
| The ids are generated here rather than by the database. `push()` builds a key
| client side from the clock and a random component without writing anything,
| which is what lets a whole batch be assembled before any of it is sent, and
| what lets a new department's designations be addressed inside the same object
| as the department.
*/

const buildBatchUpdates = (
  companyCode,
  batch = [],
  { importId = "", importedBy = "" } = {}
) => {

  const updates = {};

  batch.forEach((entry) => {

    if (entry.isNew) {

      const departmentId = push(
        ref(db, departmentsPath(companyCode))
      ).key;

      const designations = {};

      entry.designations.forEach((designation) => {

        const designationId = push(
          ref(db, `${departmentsPath(companyCode)}/${departmentId}/designations`)
        ).key;

        designations[designationId] = { name: designation.name };

      });

      /*
      | Field for field what `departmentService.addDepartment` writes, plus the
      | designations `addDesignation` would have added one at a time, plus
      | three additive fields that say where it came from.
      |
      | The three are additive and nothing reads them yet, which is the point:
      | every screen that touches a department reads `name`, `designations` and
      | `manager` by path, so none of them can see these appear - while anybody
      | asking "where did all these departments come from" has the run to trace
      | it back to. The same two fields the attendance importer adds to an
      | imported day, for the same reason.
      |
      | The designations underneath carry none of this. A designation node is
      | `{ name }` and nothing else wherever it was created, so an imported one
      | and a typed one stay byte for byte the same record.
      */
      updates[departmentId] = {
        name: entry.name,
        createdAt: Date.now(),
        designations,
        source: "IMPORT",
        importId,
        importedBy,
      };

      return;

    }

    entry.designations.forEach((designation) => {

      const designationId = push(
        ref(db, `${departmentsPath(companyCode)}/${entry.departmentId}/designations`)
      ).key;

      updates[`${entry.departmentId}/designations/${designationId}`] = {
        name: designation.name,
      };

    });

  });

  return updates;

};

/*
|--------------------------------------------------------------------------
| Writing
|--------------------------------------------------------------------------
| `onProgress` reports after each batch lands, a failed batch does not stop the
| ones after it, and the result names exactly which rows were written and which
| were not so a partial run can be finished rather than started again.
|
| The batches are not atomic with each other and cannot be made so from a
| browser. That is stated rather than hidden - it is the same limit the
| attendance importer runs under, and the reason the result screen offers the
| rows that did not land as a file to re-import.
*/

export const importDepartments = async (
  companyCode,
  plan = [],
  { importId, importedBy = "", onProgress, signal } = {}
) => {

  const result = {
    total: 0,
    imported: 0,
    failed: 0,
    processed: 0,
    departmentsCreated: 0,
    designationsCreated: 0,
    alreadyExisted: 0,
    failedRowNumbers: [],
    batches: { total: 0, succeeded: 0, failed: 0 },
    cancelled: false,
  };

  if (!companyCode || plan.length === 0) {
    return result;
  }

  /*
  |------------------------------------------------------------------------
  | The last look before anything is written
  |------------------------------------------------------------------------
  | The departments are read again here, and the plan is checked against what
  | comes back. This is what makes creating a department twice impossible
  | rather than merely unlikely.
  |
  | The plan handed to this function was built from a read taken while the user
  | was still deciding. Between that read and this write somebody else may have
  | added the department, the same file may be running in another tab, or the
  | Import button may simply have been pressed twice. Every one of those ends
  | with two departments of the same name unless the check happens here, on the
  | near side of the write, rather than on the screen that proposed it.
  |
  | A read that fails is fatal. Carrying on with the older plan is exactly the
  | case this exists to prevent.
  */

  const approved = plan.reduce(
    (sum, entry) => sum + countEntryNodes(entry),
    0
  );

  let reconciled;

  try {

    const index = buildDepartmentIndex(await getDepartments(companyCode));

    reconciled = reconcilePlan(plan, index);

  } catch (error) {

    throw failWith(
      error,
      "Department Import - final existence check",
      "Could not re-check your departments before writing. Nothing has been imported."
    );

  }

  result.total = reconciled.reduce(
    (sum, entry) => sum + countEntryNodes(entry),
    0
  );

  /*
  | Anything the plan wanted that the database already had. Reported rather
  | than silently dropped, so a run that writes less than the preview promised
  | says why on the result screen.
  */
  result.alreadyExisted = approved - result.total;

  if (reconciled.length === 0) {
    onProgress?.({ ...result });
    return result;
  }

  const batches = batchByDepartment(reconciled);

  result.batches.total = batches.length;

  onProgress?.({ ...result });

  for (let index = 0; index < batches.length; index += 1) {

    /*
    | Checked between batches rather than inside one. A batch is a single
    | atomic write - there is nothing to stop halfway through - so the only
    | honest place to stop is on a boundary, with everything before it written
    | and everything after it untouched.
    */
    if (signal?.aborted) {
      result.cancelled = true;
      break;
    }

    const batch = batches[index];

    const nodes = batch.reduce(
      (sum, entry) => sum + countEntryNodes(entry),
      0
    );

    try {

      await update(
        ref(db, departmentsPath(companyCode)),
        buildBatchUpdates(companyCode, batch, { importId, importedBy })
      );

      result.imported += nodes;

      result.batches.succeeded += 1;

      batch.forEach((entry) => {

        if (entry.isNew) result.departmentsCreated += 1;

        result.designationsCreated += entry.designations.length;

      });

    } catch (error) {

      console.error(
        `Department import batch ${index + 1} of ${batches.length} failed:`,
        error
      );

      result.failed += nodes;

      result.batches.failed += 1;

      batch.forEach((entry) => {
        result.failedRowNumbers.push(...entry.rowNumbers);
      });

      /*
      | The remaining batches are still attempted. One rejected write is very
      | often one bad batch rather than a broken connection, and stopping would
      | throw away every department after it for no reason - the result says
      | exactly what did not land either way.
      */

    }

    result.processed += nodes;

    onProgress?.({ ...result });

  }

  return result;

};

/*
|--------------------------------------------------------------------------
| Import History
|--------------------------------------------------------------------------
| companies/{companyCode}/imports/departments/{importId}
|
| Metadata only. The file is not stored and neither are its rows: the
| departments themselves are in the departments tree where they belong, which
| is the point of importing them.
|
| A failure to write this note is never allowed to fail the import. The
| departments are already in; losing the audit entry is recoverable and worth a
| console error, whereas reporting a completed import as failed is not.
*/

const buildImportRun = ({
  importId,
  fileName,
  fileSize,
  importedBy,
  totalRows,
  departmentsCreated,
  designationsCreated,
  skippedRows,
  failedNodes,
  invalidRows,
  status,
}) => ({

  importId,

  fileName: String(fileName || "").slice(0, 200),

  fileSize: fileSize || 0,

  uploadedBy: importedBy || "",

  uploadedAt: Date.now(),

  totalRows: totalRows || 0,

  departmentsCreated: departmentsCreated || 0,

  designationsCreated: designationsCreated || 0,

  skippedRows: skippedRows || 0,

  failedNodes: failedNodes || 0,

  invalidRows: invalidRows || 0,

  status,

});

export const startImportRun = async (companyCode, run) => {

  try {

    await update(
      ref(db, `${importsPath(companyCode)}/${run.importId}`),
      buildImportRun({ ...run, status: IMPORT_STATUS.PROCESSING })
    );

    return { success: true };

  } catch (error) {

    console.error("Failed to record the start of a department import:", error);

    return { success: false };

  }

};

export const completeImportRun = async (companyCode, run) => {

  try {

    await update(
      ref(db, `${importsPath(companyCode)}/${run.importId}`),
      buildImportRun(run)
    );

    return { success: true };

  } catch (error) {

    console.error("Failed to record the result of a department import:", error);

    return { success: false };

  }

};

/*
| The most recent runs, newest first.
|
| Ordered and limited by the database wherever it will do it, so opening the
| history downloads the last twenty entries and not every import a company has
| ever run. See the note on the fallback below for when it will not.
*/

const newestFirst = (value, limit) =>
  Object.values(value || {})
    .sort((a, b) => (b?.uploadedAt || 0) - (a?.uploadedAt || 0))
    .slice(0, limit);

/*
| An ordered query needs `.indexOn: ["uploadedAt"]` on this node, and the rules
| for it have never been deployed - see §4 and §6 of `department-import-rules`.
| Firebase usually answers an unindexed query anyway and only warns, but where
| it refuses outright it rejects the read, and a rejected read here is a history
| that is empty on screen while every run sits in the database.
|
| So the ordered query is tried and a refusal over the index falls back to
| reading the node whole, sorting and trimming in the browser. The node holds
| one small record per import, so the fallback is cheap and only ever runs until
| the index exists. Anything that is not an index complaint - a denied read, a
| dropped connection - is still raised, because those are real and the panel
| says so.
*/

const isMissingIndexError = (error) =>
  String(error?.message || "").toLowerCase().includes("index not defined");

export const getImportHistory = async (companyCode, limit = 20) => {

  try {

    if (!companyCode) return [];

    const node = ref(db, importsPath(companyCode));

    let snapshot;

    try {

      snapshot = await get(
        query(node, orderByChild("uploadedAt"), limitToLast(limit))
      );

    } catch (queryError) {

      if (!isMissingIndexError(queryError)) throw queryError;

      console.warn(
        `Department import history is not indexed. Add ".indexOn": ["uploadedAt"] at ${importsPath(companyCode)}.`
      );

      snapshot = await get(node);

    }

    if (!snapshot.exists()) return [];

    return newestFirst(snapshot.val(), limit);

  } catch (error) {

    throw failWith(
      error,
      "Department Import - history",
      "Could not load the import history."
    );

  }

};
