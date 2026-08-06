import { useMemo, useState } from "react";
import { FiCalendar, FiEdit2, FiSearch, FiTrash2 } from "react-icons/fi";
import {
  AttendancePanel,
  ExportButton,
  FilterSelect,
} from "../attendance/common/AttendancePanel";
import DataTable from "../attendance/common/DataTable";
import { MONTHS } from "../../utils/attendance/attendanceConstants";
import { downloadCsv } from "../../utils/attendance/attendanceTable";
import {
  HOLIDAY_PAGE_SIZE,
  HOLIDAY_TYPE_OPTIONS,
} from "../../utils/holiday/holidayConstants";
import {
  HOLIDAY_EXPORT_HEADER,
  filterHolidays,
  formatHolidayDate,
  getDayName,
  isPastHoliday,
  toHolidayExportRow,
} from "../../utils/holiday/holidayUtils";
import HolidayTypeBadge from "./common/HolidayTypeBadge";

/*
|--------------------------------------------------------------------------
| Holiday Table
|--------------------------------------------------------------------------
| The full holiday list of the selected year with search, filters, sorting,
| pagination and a CSV export.
|
| Filtering stays here while sorting and pagination live in `DataTable`,
| which is the split every attendance and leave table already uses.
|
| Columns are prioritised rather than all forced onto a phone: the holiday,
| its date and the actions stay on every screen, and the day, type and
| description drop out as the viewport narrows. Each of them is repeated
| inside the holiday cell, so nothing is lost on a small screen.
|--------------------------------------------------------------------------
*/

const HIDDEN_UNTIL = {
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
  "2xl": "hidden 2xl:table-cell",
};

const MONTH_OPTIONS = MONTHS.map((label, index) => ({
  value: String(index + 1),
  label,
}));

const OPTIONAL_OPTIONS = [
  { value: "optional", label: "Optional Only" },
  { value: "mandatory", label: "Mandatory Only" },
];

function HolidayTable({
  holidays = [],
  loading = false,
  error = "",
  onRetry,
  year,
  headerSearch = "",
  onEdit,
  onDelete,
  title = "Holiday List",
  subtitle,
  emptyTitle = "No Holidays Declared",
  emptyMessage = "Holidays you add will appear here.",
}) {

  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [optional, setOptional] = useState("");
  const [month, setMonth] = useState("");

  /*
  | The navbar search and the table's own box filter the same list, so a
  | keyword typed in either place narrows it.
  */
  const keyword = search || headerSearch;

  const filtered = useMemo(
    () =>
      filterHolidays(holidays, {
        search: keyword,
        type,
        optional,
        month,
      }),
    [holidays, keyword, type, optional, month]
  );

  const handleExport = () => {

    downloadCsv(
      `holidays-${year}.csv`,
      HOLIDAY_EXPORT_HEADER,
      filtered.map(toHolidayExportRow)
    );

  };

  /*
  | Written out in full rather than built from a breakpoint variable:
  | Tailwind generates its CSS by scanning the source for literal class
  | names, so an interpolated `${bp}:table-cell` would never be emitted.
  */

  const hideBelow = (breakpoint) => ({
    headerClassName: HIDDEN_UNTIL[breakpoint],
    className: HIDDEN_UNTIL[breakpoint],
  });

  const columns = [

    {
      key: "name",
      label: "Holiday",
      sortable: true,
      render: (row) => {

        /*
        | A holiday that has already passed is dimmed rather than hidden: the
        | year's list is a record as much as it is a plan.
        */
        const past = isPastHoliday(row);

        return (

          <div className="flex min-w-0 items-start gap-3">

            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                past
                  ? "bg-slate-100 text-slate-400"
                  : "bg-blue-50 text-blue-600"
              }`}
            >
              <FiCalendar />
            </div>

            <div className="min-w-0">

              <p
                className={`truncate font-semibold ${
                  past ? "text-slate-500" : "text-slate-800"
                }`}
              >
                {row.name}
              </p>

              {/*
              | The columns hidden at this width, folded in here. Each span is
              | hidden at exactly the breakpoint where its own column appears,
              | so a value is never shown twice and never missing in between.
              */}
              <p className="mt-1 text-xs text-slate-500 lg:hidden">

                <span className="md:hidden">
                  {getDayName(row.date, { short: true })}
                  {" · "}
                </span>

                {row.type}
                {row.isOptional ? " · Optional" : ""}

              </p>

              {row.description && (
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-400 2xl:hidden">
                  {row.description}
                </p>
              )}

            </div>

          </div>

        );

      },
    },

    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (row) => (
        <span className="whitespace-nowrap text-sm font-medium text-slate-700">
          {formatHolidayDate(row.date)}
        </span>
      ),
    },

    {
      key: "day",
      label: "Day",
      ...hideBelow("md"),
      render: (row) => (
        <span className="whitespace-nowrap text-sm text-slate-600">
          {getDayName(row.date)}
        </span>
      ),
    },

    {
      key: "type",
      label: "Type",
      sortable: true,
      align: "center",
      ...hideBelow("lg"),
      render: (row) => (
        <div className="flex justify-center">
          <HolidayTypeBadge
            type={row.type}
            isOptional={row.isOptional}
            size="sm"
          />
        </div>
      ),
    },

    {
      key: "description",
      label: "Description",
      ...hideBelow("2xl"),
      render: (row) => (
        <p
          title={row.description}
          className="line-clamp-2 max-w-[260px] text-sm text-slate-600"
        >
          {row.description || "--"}
        </p>
      ),
    },

    ...(onEdit || onDelete
      ? [
          {
            key: "actions",
            label: "Actions",
            align: "right",
            className: "whitespace-nowrap",
            render: (row) => (

              <div className="flex items-center justify-end gap-2">

                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(row)}
                    aria-label="Edit holiday"
                    title="Edit holiday"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <FiEdit2 size={14} />
                  </button>
                )}

                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(row)}
                    aria-label="Delete holiday"
                    title="Delete holiday"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-all hover:border-red-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <FiTrash2 size={14} />
                  </button>
                )}

              </div>

            ),
          },
        ]
      : []),

  ];

  return (

    <AttendancePanel
      title={title}
      subtitle={
        subtitle || `Every holiday declared for ${year}`
      }
      action={
        <ExportButton
          onClick={handleExport}
          disabled={filtered.length === 0}
          label="Export CSV"
        />
      }
      toolbar={
        <>

          <div className="relative w-full lg:max-w-sm">

            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search holidays..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 lg:w-auto">

            <FilterSelect
              value={type}
              onChange={setType}
              options={HOLIDAY_TYPE_OPTIONS}
              placeholder="All Types"
              ariaLabel="Filter by holiday type"
            />

            <FilterSelect
              value={month}
              onChange={setMonth}
              options={MONTH_OPTIONS}
              placeholder="All Months"
              ariaLabel="Filter by month"
            />

            <FilterSelect
              value={optional}
              onChange={setOptional}
              options={OPTIONAL_OPTIONS}
              placeholder="All Holidays"
              ariaLabel="Filter by optional holidays"
            />

          </div>

        </>
      }
    >

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(row) => row.holidayId}
        loading={loading}
        error={error}
        onRetry={onRetry}
        skeleton
        defaultSortBy="date"
        defaultSortOrder="asc"
        resetKey={`${keyword}|${type}|${optional}|${month}`}
        pageSize={HOLIDAY_PAGE_SIZE}
        paginationLabel="holidays"
        /*
        | Grows with the columns that appear at each breakpoint, so a phone
        | scrolls a compact three column table instead of a 1100px one.
        */
        minWidthClass="min-w-[420px] md:min-w-[560px] lg:min-w-[720px] xl:min-w-[900px]"
        loadingMessage="Loading holidays..."
        empty={{
          icon: <FiCalendar size={28} />,
          title: emptyTitle,
          message: emptyMessage,
        }}
      />

    </AttendancePanel>

  );

}

export default HolidayTable;
