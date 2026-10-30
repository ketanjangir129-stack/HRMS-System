import * as XLSX from "xlsx";

import { getDateKey, parseDateKey } from "../attendance/attendanceDate";
import {
  HOLIDAY_DESCRIPTION_MAX,
  HOLIDAY_IMPORT_COLUMNS,
  HOLIDAY_IMPORT_MAX_BYTES,
  HOLIDAY_IMPORT_MAX_ROWS,
  HOLIDAY_NAME_MAX,
  HOLIDAY_NAME_MIN,
  HOLIDAY_TYPE,
} from "./holidayConstants";

/*
|--------------------------------------------------------------------------
| Holiday Import
|--------------------------------------------------------------------------
| Turns an Excel, CSV or PDF holiday list into rows the import modal can
| preview and the server can write.
|
| The file must carry four columns - Date, Name, Type, Description - in any
| order, with the header on any of the first few lines (a title above the
| table is common in a PDF circular). An "Optional" column is read when it is
| there and ignored when it is not.
|
| Every row is checked here so the preview can say exactly which rows will be
| added, which already exist and which are wrong. The server checks again
| before it writes.
|--------------------------------------------------------------------------
*/

export const IMPORT_ROW_STATUS = {
  VALID: "valid",
  INVALID: "invalid",
  DUPLICATE: "duplicate",
};

const HEADER_SEARCH_ROWS = 10;

const normalizeHeader = (value) =>
  String(value ?? "").trim().toLowerCase().replace(/[^a-z]/g, "");

const REQUIRED_KEYS = HOLIDAY_IMPORT_COLUMNS.map(normalizeHeader);

const OPTIONAL_HEADER_KEYS = ["optional", "isoptional"];

/*
|--------------------------------------------------------------------------
| Dates
|--------------------------------------------------------------------------
| Holiday lists arrive in every format an office uses. Numeric dates are
| read day first (31/10/2026), the way they are written in India; ISO dates
| (2026-10-31) and written months (31 Oct 2026, Oct 31, 2026) are read as
| they are. Excel cells holding real dates come through as serial numbers.
*/

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const toKey = (year, month, day) => {

  const key = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const parsed = parseDateKey(key);

  // A date that does not come back as it went in (31 Feb) never existed.
  return parsed && getDateKey(parsed) === key ? key : null;

};

const expandYear = (year) => {
  const value = Number(year);
  return value < 100 ? 2000 + value : value;
};

const monthFromName = (name) =>
  MONTHS[String(name).toLowerCase().slice(0, 4)] ||
  MONTHS[String(name).toLowerCase().slice(0, 3)];

export const parseImportDate = (value) => {

  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toKey(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  if (typeof value === "number") {
    const code = XLSX.SSF.parse_date_code(value);
    return code ? toKey(code.y, code.m, code.d) : null;
  }

  // "Friday, 31 Oct 2026" - the weekday adds nothing.
  const text = String(value)
    .trim()
    .replace(/^(mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?,?\s+/i, "")
    .replace(/(\d)(st|nd|rd|th)\b/gi, "$1");

  let match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) return toKey(match[1], match[2], match[3]);

  match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
  if (match) return toKey(expandYear(match[3]), match[2], match[1]);

  match = text.match(/^(\d{1,2})[\s-]+([a-z]+)\.?[\s,-]+(\d{2}|\d{4})$/i);
  if (match && monthFromName(match[2])) {
    return toKey(expandYear(match[3]), monthFromName(match[2]), match[1]);
  }

  match = text.match(/^([a-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (match && monthFromName(match[1])) {
    return toKey(match[3], monthFromName(match[1]), match[2]);
  }

  // A bare number in a CSV can still be an Excel serial pasted as text.
  if (/^\d{5}(\.\d+)?$/.test(text)) {
    return parseImportDate(Number(text));
  }

  return null;

};

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
| "national holiday", "Festival", "COMPANY EVENT" and "event" all land on
| the stored labels.
*/

const TYPE_ALIASES = {
  national: HOLIDAY_TYPE.NATIONAL,
  gazetted: HOLIDAY_TYPE.NATIONAL,
  public: HOLIDAY_TYPE.NATIONAL,
  festival: HOLIDAY_TYPE.FESTIVAL,
  religious: HOLIDAY_TYPE.FESTIVAL,
  company: HOLIDAY_TYPE.COMPANY,
  event: HOLIDAY_TYPE.EVENT,
  companyevent: HOLIDAY_TYPE.EVENT,
  fixedevent: HOLIDAY_TYPE.EVENT,
};

export const parseImportType = (value) => {

  const key = normalizeHeader(value).replace(/holiday$/, "");

  return TYPE_ALIASES[key] || null;

};

const parseOptional = (value) =>
  ["yes", "y", "true", "1", "optional"].includes(
    String(value ?? "").trim().toLowerCase()
  );

/*
|--------------------------------------------------------------------------
| Header
|--------------------------------------------------------------------------
*/

const findHeader = (rows) => {

  for (let index = 0; index < Math.min(rows.length, HEADER_SEARCH_ROWS); index += 1) {

    const keys = (rows[index] || []).map(normalizeHeader);

    if (REQUIRED_KEYS.every((key) => keys.includes(key))) {

      const columns = Object.fromEntries(
        REQUIRED_KEYS.map((key) => [key, keys.indexOf(key)])
      );

      const optionalIndex = keys.findIndex((key) =>
        OPTIONAL_HEADER_KEYS.includes(key)
      );

      return { index, columns, optionalIndex };

    }

  }

  return null;

};

const describeMissingColumns = (rows) => {

  // The line that looks most like a header decides what is reported missing.
  let best = [];

  rows.slice(0, HEADER_SEARCH_ROWS).forEach((row) => {
    const keys = (row || []).map(normalizeHeader);
    const found = REQUIRED_KEYS.filter((key) => keys.includes(key));
    if (found.length > best.length) best = found;
  });

  const missing = HOLIDAY_IMPORT_COLUMNS.filter(
    (column) => !best.includes(normalizeHeader(column))
  );

  return `The file must have the columns ${HOLIDAY_IMPORT_COLUMNS.join(", ")}. Missing: ${missing.join(", ")}.`;

};

/*
|--------------------------------------------------------------------------
| Reading the file
|--------------------------------------------------------------------------
| Every reader returns the same thing: an array of rows, each an array of
| cell values, header included.
*/

const readSpreadsheet = async (file) => {

  const isCsv = /\.csv$/i.test(file.name);

  /*
  | A CSV is read as text with `raw`, so "31/10/2026" stays a string instead
  | of being guessed into a US month-first date by the parser.
  */
  const workbook = isCsv
    ? XLSX.read(await file.text(), { type: "string", raw: true })
    : XLSX.read(await file.arrayBuffer(), { type: "array" });

  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!sheet) return [];

  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: "",
    blankrows: false,
  });

};

/*
| A PDF has no cells, only text placed on a page. Text on the same line is
| grouped into a row, and each piece is put under the header column it sits
| beneath. A line with nothing in the Date column is a description that
| wrapped, so it is joined to the row above.
*/

const LINE_TOLERANCE = 3;

const readPdfLines = async (file) => {

  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;

  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;

  const lines = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {

    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageLines = [];

    content.items.forEach((item) => {

      const text = String(item.str || "").trim();
      if (!text) return;

      const x = item.transform[4];
      const y = item.transform[5];

      let line = pageLines.find((entry) => Math.abs(entry.y - y) <= LINE_TOLERANCE);

      if (!line) {
        line = { y, items: [] };
        pageLines.push(line);
      }

      line.items.push({ x, text });

    });

    // PDF y runs bottom to top.
    pageLines
      .sort((a, b) => b.y - a.y)
      .forEach((line) => {
        line.items.sort((a, b) => a.x - b.x);
        lines.push(line.items);
      });

  }

  return lines;

};

const readPdf = async (file) => rowsFromPdfLines(await readPdfLines(file));

export const rowsFromPdfLines = (lines) => {

  const headerIndex = lines.findIndex((items) => {
    const keys = items.map((item) => normalizeHeader(item.text));
    return REQUIRED_KEYS.every((key) => keys.includes(key));
  });

  if (headerIndex === -1) {
    return lines.map((items) => items.map((item) => item.text));
  }

  const header = lines[headerIndex]
    .map((item) => ({ key: normalizeHeader(item.text), text: item.text, x: item.x }))
    .sort((a, b) => a.x - b.x);

  // A piece belongs to the right-most header that starts at or before it.
  const columnFor = (x) => {
    let column = 0;
    header.forEach((entry, index) => {
      if (x >= entry.x - 4) column = index;
    });
    return column;
  };

  const dateColumn = header.findIndex((entry) => entry.key === "date");
  const descriptionColumn = header.findIndex((entry) => entry.key === "description");

  const rows = [header.map((entry) => entry.text)];

  lines.slice(headerIndex + 1).forEach((items) => {

    const cells = header.map(() => "");

    items.forEach((item) => {
      const column = columnFor(item.x);
      cells[column] = cells[column] ? `${cells[column]} ${item.text}` : item.text;
    });

    // The header repeated at the top of the next page.
    const keys = cells.map(normalizeHeader);
    if (REQUIRED_KEYS.every((key) => keys.includes(key))) return;

    const previous = rows[rows.length - 1];

    if (!cells[dateColumn] && rows.length > 1 && cells.some(Boolean)) {
      const extra = cells.filter(Boolean).join(" ");
      previous[descriptionColumn] = `${previous[descriptionColumn] || ""} ${extra}`.trim();
      return;
    }

    rows.push(cells);

  });

  return rows;

};

/*
|--------------------------------------------------------------------------
| Validating
|--------------------------------------------------------------------------
*/

const validateRow = (row) => {

  const errors = [];

  if (!row.date) {
    errors.push(
      row.rawDate
        ? `"${row.rawDate}" is not a valid date.`
        : "Date is required."
    );
  }

  if (!row.name) {
    errors.push("Name is required.");
  } else if (row.name.length < HOLIDAY_NAME_MIN) {
    errors.push(`Name must be at least ${HOLIDAY_NAME_MIN} characters.`);
  } else if (row.name.length > HOLIDAY_NAME_MAX) {
    errors.push(`Name cannot exceed ${HOLIDAY_NAME_MAX} characters.`);
  }

  if (!row.type) {
    errors.push(
      row.rawType
        ? `"${row.rawType}" is not a valid type. Use National, Festival, Company or Event.`
        : "Type is required."
    );
  }

  if (row.description.length > HOLIDAY_DESCRIPTION_MAX) {
    errors.push(`Description cannot exceed ${HOLIDAY_DESCRIPTION_MAX} characters.`);
  }

  return errors;

};

/*
| `existing` is every holiday already declared in the years the file
| touches, so a row for a date that is already a holiday is shown as a skip
| before anything is sent.
*/

export const buildImportRows = (rows, header, existing = []) => {

  const { index, columns, optionalIndex } = header;

  const taken = new Map(
    existing.filter((holiday) => holiday?.date).map((holiday) => [holiday.date, holiday.name])
  );

  const seenInFile = new Map();

  const result = [];

  rows.slice(index + 1).forEach((cells, offset) => {

    const read = (column) => cells?.[column] ?? "";

    // Spreadsheet row numbers count from 1 and include the header.
    const rowNumber = index + offset + 2;

    const rawDate = read(columns.date);
    const rawType = String(read(columns.type)).trim();
    const name = String(read(columns.name)).trim().replace(/\s+/g, " ");
    const description = String(read(columns.description)).trim();

    if (!String(rawDate).trim() && !name && !rawType && !description) return;

    const row = {
      rowNumber,
      rawDate: rawDate instanceof Date ? rawDate.toDateString() : String(rawDate).trim(),
      date: parseImportDate(rawDate),
      name,
      rawType,
      type: parseImportType(rawType),
      description,
      isOptional: optionalIndex >= 0 ? parseOptional(read(optionalIndex)) : false,
      errors: [],
      status: IMPORT_ROW_STATUS.VALID,
      note: "",
    };

    row.errors = validateRow(row);

    if (row.errors.length > 0) {
      row.status = IMPORT_ROW_STATUS.INVALID;
    } else if (taken.has(row.date)) {
      row.status = IMPORT_ROW_STATUS.DUPLICATE;
      row.note = `"${taken.get(row.date)}" already exists on this date.`;
    } else if (seenInFile.has(row.date)) {
      row.status = IMPORT_ROW_STATUS.DUPLICATE;
      row.note = `Same date as row ${seenInFile.get(row.date)}.`;
    } else {
      seenInFile.set(row.date, rowNumber);
    }

    result.push(row);

  });

  return result;

};

/*
| Reads the file and checks its columns. Rows are validated separately by
| `buildImportRows`, once the existing holidays for the file's years are in.
*/

export const readHolidayImportFile = async (file) => {

  if (!file) {
    throw new Error("Please choose a file to import.");
  }

  if (!/\.(xlsx|xls|csv|pdf)$/i.test(file.name)) {
    throw new Error("Only Excel (.xlsx, .xls), CSV or PDF files can be imported.");
  }

  if (file.size > HOLIDAY_IMPORT_MAX_BYTES) {
    throw new Error("The file must be smaller than 5 MB.");
  }

  let rows;

  try {
    rows = /\.pdf$/i.test(file.name)
      ? await readPdf(file)
      : await readSpreadsheet(file);
  } catch (error) {
    console.error("Holiday import - read failed:", error);
    throw new Error(
      "The file could not be read. Check that it is not damaged or password protected.",
      { cause: error }
    );
  }

  if (!rows.length) {
    throw new Error("The file is empty.");
  }

  const header = findHeader(rows);

  if (!header) {
    throw new Error(describeMissingColumns(rows));
  }

  const dataRows = rows.length - header.index - 1;

  if (dataRows <= 0) {
    throw new Error("The file has a header but no holiday rows.");
  }

  if (dataRows > HOLIDAY_IMPORT_MAX_ROWS) {
    throw new Error(`At most ${HOLIDAY_IMPORT_MAX_ROWS} holidays can be imported at once.`);
  }

  return { rows, header };

};

/*
| The years a file touches, so the existing holidays for exactly those years
| can be read before the preview is built.
*/

export const getImportYears = (rows, header) => [
  ...new Set(
    rows
      .slice(header.index + 1)
      .map((cells) => parseImportDate(cells?.[header.columns.date]))
      .filter(Boolean)
      .map((date) => Number(date.slice(0, 4)))
  ),
];

/*
|--------------------------------------------------------------------------
| Template
|--------------------------------------------------------------------------
*/

const TEMPLATE_ROWS = [
  HOLIDAY_IMPORT_COLUMNS,
  ["2026-01-26", "Republic Day", "National", "National holiday"],
  ["2026-03-04", "Holi", "Festival", "Festival of colours"],
  ["2026-11-08", "Diwali", "Festival", "Festival of lights"],
  ["2026-04-01", "Foundation Day", "Event", "Company foundation day celebration"],
  ["2026-12-31", "Year End Shutdown", "Company", "Office closed for year end"],
];

export const downloadHolidayTemplate = (format = "xlsx") => {

  const sheet = XLSX.utils.aoa_to_sheet(TEMPLATE_ROWS);

  sheet["!cols"] = [{ wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 40 }];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, sheet, "Holidays");

  XLSX.writeFile(
    workbook,
    `holiday-import-template.${format === "csv" ? "csv" : "xlsx"}`,
    { bookType: format === "csv" ? "csv" : "xlsx" }
  );

};
