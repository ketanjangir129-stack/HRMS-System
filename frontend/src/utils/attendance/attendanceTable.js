import { PAGE_SIZE } from "./attendanceConstants";

/*
|--------------------------------------------------------------------------
| Table Helpers
|--------------------------------------------------------------------------
| Generic search / sort / paginate / export helpers shared by every
| attendance table. Keeping one implementation here means the requests list
| and the report tables cannot drift apart.
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Search
|--------------------------------------------------------------------------
| `fields` supports dotted paths so nested values can be searched too.
*/

export const searchRows = (rows = [], keyword = "", fields = []) => {

  const search = keyword.trim().toLowerCase();

  if (!search) return rows;

  return rows.filter((row) =>
    fields.some((field) =>
      String(
        field
          .split(".")
          .reduce((value, key) => value?.[key], row) ?? ""
      )
        .toLowerCase()
        .includes(search)
    )
  );

};

/*
|--------------------------------------------------------------------------
| Sort
|--------------------------------------------------------------------------
| Numbers are compared numerically and everything else with `localeCompare`,
| so "10" never sorts before "9" on a numeric column.
*/

export const sortRows = (rows = [], sortBy = "", sortOrder = "asc") => {

  if (!sortBy) return [...rows];

  const direction = sortOrder === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {

    const aValue = a?.[sortBy];
    const bValue = b?.[sortBy];

    if (typeof aValue === "number" || typeof bValue === "number") {
      return ((aValue || 0) - (bValue || 0)) * direction;
    }

    return (
      String(aValue ?? "").localeCompare(String(bValue ?? "")) * direction
    );

  });

};

/*
|--------------------------------------------------------------------------
| Pagination
|--------------------------------------------------------------------------
*/

export const paginate = (rows = [], page = 1, pageSize = PAGE_SIZE) => {

  const start = (page - 1) * pageSize;

  return rows.slice(start, start + pageSize);

};

export const getTotalPages = (total = 0, pageSize = PAGE_SIZE) =>
  Math.max(1, Math.ceil(total / pageSize));

/*
| The numbers shown by "Showing x-y of z". Returns zeroes for an empty list so
| the UI never renders "Showing 1-0 of 0".
*/

export const getPageRange = (total = 0, page = 1, pageSize = PAGE_SIZE) => {

  if (total === 0) {
    return { from: 0, to: 0, total };
  }

  return {
    from: (page - 1) * pageSize + 1,
    to: Math.min(page * pageSize, total),
    total,
  };

};

/*
|--------------------------------------------------------------------------
| CSV Export
|--------------------------------------------------------------------------
| Quotes inside a value must be doubled, otherwise the field ends early and
| every following column shifts.
*/

export const toCsv = (header = [], rows = []) =>
  [header, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

export const downloadCsv = (fileName, header, rows) => {

  const blob = new Blob([toCsv(header, rows)], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);

};
