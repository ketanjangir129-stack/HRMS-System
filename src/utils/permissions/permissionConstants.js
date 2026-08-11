import { ROLE } from "../attendance/attendanceConstants";

/*
|--------------------------------------------------------------------------
| Permission Registry
|--------------------------------------------------------------------------
| Every page and every section the owner can switch on or off, declared once.
|
| This file is the single place a new screen is registered. The defaults, the
| Settings checkboxes, the sidebar filter, the route guards and the stored
| shape in Firebase are all derived from this list, so adding a page is one
| entry here rather than an edit in five places.
|
| A permission is addressed by a dotted path:
|
|   "attendance"           the page
|   "attendance.analytics" a section inside that page
|
| A section is anything the owner should be able to withhold without taking
| the whole page away: a panel on a dashboard, or a sub-route such as
| /attendance/reports. Both are the same kind of switch, so both are sections.
|--------------------------------------------------------------------------
*/

export const OWNER_ROLE = ROLE.OWNER;

/*
| The roles the Roles & Access screen can edit. Owner is deliberately absent:
| it is never stored and never editable.
*/

export const MANAGED_ROLES = [ROLE.HR, ROLE.EMPLOYEE];

export const ROLE_LABELS = {
  [ROLE.OWNER]: "Owner",
  [ROLE.HR]: "HR",
  [ROLE.EMPLOYEE]: "Employee",
};

export const ROLE_DESCRIPTIONS = {
  [ROLE.HR]: "Manages people, attendance, leave and payroll for the company.",
  [ROLE.EMPLOYEE]: "Self service access to their own attendance, leave and tasks.",
};

/*
|--------------------------------------------------------------------------
| Pages
|--------------------------------------------------------------------------
| `defaults` is what a company that has never opened Roles & Access gets, and
| what "Reset to Defaults" restores. HR is given a full HRMS desk; employee is
| given self service.
|
| `path` is the route the sidebar links to and the route guard falls back to.
| A section carrying its own `path` is a sub-route rather than a panel.
|--------------------------------------------------------------------------
*/

export const PERMISSION_PAGES = [

  {
    key: "dashboard",
    label: "Dashboard",
    description: "Landing page with tasks and shortcuts",
    path: "/dashboard",
    defaults: { hr: true, employee: true },
    sections: [
      {
        key: "tasks",
        label: "Today's Tasks",
        description: "Tasks assigned to the signed in user",
        defaults: { hr: true, employee: true },
      },
      {
        key: "quickLinks",
        label: "Quick Links",
        description: "Shortcuts to frequently used modules",
        defaults: { hr: true, employee: true },
      },
    ],
  },

  {
    key: "departments",
    label: "Departments",
    description: "Departments and designations",
    path: "/departments",
    defaults: { hr: true, employee: false },
    sections: [],
  },

  {
    key: "employees",
    label: "Employees",
    description: "Employee directory and profiles",
    path: "/employees",
    defaults: { hr: true, employee: false },
    sections: [
      {
        key: "add",
        label: "Add Employee",
        description: "Create a new employee record",
        path: "/employees/add",
        defaults: { hr: true, employee: false },
      },
      {
        key: "details",
        label: "Employee Details",
        description: "Open a single employee profile",
        path: "/employees/details",
        defaults: { hr: true, employee: false },
      },
    ],
  },

  {
    key: "onboarding",
    label: "On-boarding",
    description: "Invite and review new joiners",
    path: "/OnboardDashboard",
    defaults: { hr: true, employee: false },
    sections: [
      {
        key: "create",
        label: "Create On-boarding",
        description: "Send a new on-boarding invite",
        path: "/OnboardDashboard/OnBoardForm",
        defaults: { hr: true, employee: false },
      },
      {
        key: "requests",
        label: "On-boarding Requests",
        description: "Submissions waiting to be reviewed",
        path: "/OnboardDashboard/OnBoardRequest",
        defaults: { hr: true, employee: false },
      },
      {
        key: "history",
        label: "On-boarding History",
        description: "Completed and rejected submissions",
        path: "/OnboardDashboard/OnBoardhistory",
        defaults: { hr: true, employee: false },
      },
    ],
  },

  {
    key: "attendance",
    label: "Attendance",
    description: "Daily attendance, corrections and reports",
    path: "/attendance",
    defaults: { hr: true, employee: true },
    sections: [
      {
        key: "summary",
        label: "Summary Cards",
        description: "Present, late and absent counts for today",
        defaults: { hr: true, employee: true },
      },
      {
        key: "today",
        label: "Today's Attendance",
        description: "The whole company's attendance for today",
        defaults: { hr: true, employee: false },
      },
      {
        key: "calendar",
        label: "Calendar",
        description: "The signed in user's month",
        defaults: { hr: true, employee: true },
      },
      {
        key: "recentActivity",
        label: "Recent Activity",
        description: "Live punch in and punch out feed",
        defaults: { hr: true, employee: true },
      },
      {
        key: "analytics",
        label: "Analytics",
        description: "Attendance rates and trends",
        defaults: { hr: true, employee: false },
      },
      {
        key: "requests",
        label: "Requests",
        description: "Attendance corrections and approvals",
        path: "/attendance/requests",
        defaults: { hr: true, employee: true },
      },
      {
        key: "myAttendance",
        label: "My Attendance",
        description: "The signed in user's own month",
        path: "/attendance/my",
        defaults: { hr: true, employee: true },
      },
      {
        key: "daily",
        label: "Daily Attendance",
        description: "Every employee on a chosen day",
        path: "/attendance/daily",
        defaults: { hr: true, employee: false },
      },
      {
        key: "monthly",
        label: "Monthly Attendance",
        description: "Every employee across a month",
        path: "/attendance/monthly",
        defaults: { hr: true, employee: false },
      },
      {
        key: "regularization",
        label: "Regularization",
        description: "Raise a correction for a past day",
        path: "/attendance/regularization",
        defaults: { hr: true, employee: true },
      },
      {
        key: "reports",
        label: "Reports",
        description: "Daily, monthly and department reports",
        path: "/attendance/reports",
        defaults: { hr: true, employee: false },
      },
      {
        key: "settings",
        label: "Attendance Settings",
        description: "Working hours and attendance rules",
        path: "/attendance/settings",
        defaults: { hr: false, employee: false },
      },
    ],
  },

  {
    key: "leave",
    label: "Leave",
    description: "Leave balance, applications and approvals",
    path: "/leave",
    defaults: { hr: true, employee: true },
    sections: [
      {
        key: "balance",
        label: "Leave Balance",
        description: "Allocated, used and remaining days",
        defaults: { hr: true, employee: true },
      },
      {
        key: "calendar",
        label: "Calendar",
        description: "Leave plotted across the year",
        defaults: { hr: true, employee: true },
      },
      {
        key: "history",
        label: "History",
        description: "Every leave request of the year",
        defaults: { hr: true, employee: true },
      },
      {
        key: "apply",
        label: "Apply Leave",
        description: "Submit a new leave request",
        defaults: { hr: true, employee: true },
      },
      {
        key: "approvals",
        label: "Approvals",
        description: "Review the company's leave requests",
        path: "/leave/approvals",
        defaults: { hr: true, employee: false },
      },
    ],
  },

  {
    key: "holidays",
    label: "Holidays",
    description: "The company holiday calendar",
    path: "/holidays",
    defaults: { hr: true, employee: true },
    sections: [
      {
        key: "calendar",
        label: "Calendar",
        description: "Holidays plotted across the year",
        defaults: { hr: true, employee: true },
      },
      {
        key: "upcoming",
        label: "Upcoming Holidays",
        description: "What is coming up next",
        defaults: { hr: true, employee: true },
      },
      {
        key: "list",
        label: "Holiday List",
        description: "The full list, with add, edit and delete",
        defaults: { hr: true, employee: true },
      },
      {
        key: "add",
        label: "Add Holiday",
        description: "Declare a new company holiday",
        defaults: { hr: true, employee: false },
      },
      {
        key: "edit",
        label: "Edit Holiday",
        description: "Change a declared holiday",
        defaults: { hr: true, employee: false },
      },
      {
        key: "delete",
        label: "Delete Holiday",
        description: "Remove a declared holiday",
        defaults: { hr: true, employee: false },
      },
    ],
  },

  {
    key: "salary",
    label: "Salary",
    description: "Salary structures and revisions",
    path: "/salarydashboard",
    defaults: { hr: true, employee: false },
    sections: [
      /*
      | The screen the two actions below are performed on. Withholding it takes
      | the module card and the route away; withholding an action leaves the
      | screen readable but takes that one button off it.
      */
      {
        key: "manage",
        label: "Create & Update Screen",
        description: "Open the salary create and update list",
        path: "/salarydashboard/salary",
        defaults: { hr: true, employee: false },
      },
      {
        key: "create",
        label: "Create Salary",
        description: "Assign a new salary structure to an employee",
        path: "/salarydashboard/salary/create",
        defaults: { hr: true, employee: false },
      },
      {
        key: "update",
        label: "Update Salary",
        description: "Revise an employee's existing salary",
        path: "/salarydashboard/salary/edit",
        defaults: { hr: true, employee: false },
      },
      {
        key: "revisions",
        label: "Revisions",
        description: "Salary revision history",
        path: "/salarydashboard/salary/revisions",
        defaults: { hr: true, employee: false },
      },
      {
        key: "history",
        label: "Employee History",
        description: "One employee's salary history",
        path: "/salarydashboard/salary/history",
        defaults: { hr: true, employee: false },
      },
    ],
  },

  {
    key: "payroll",
    label: "Payroll",
    description: "Payroll runs and payslips",
    path: "/payrolldashboard",
    defaults: { hr: true, employee: false },
    sections: [
      {
        key: "payslip",
        label: "Payslips",
        description: "Open an individual payslip",
        path: "/payrolldashboard/payslip",
        defaults: { hr: true, employee: false },
      },
       {
        key: "generate",
        label: "Generate Payroll",
        description: "Run the month's payroll, for one employee or all",
        defaults: { hr: true, employee: false },
      },
      {
        key: "approve",
        label: "Approve Payroll",
        description: "Sign off a generated month and close it to changes",
        defaults: { hr: false, employee: false },
      },
      {
        key: "lock",
        label: "Lock Payroll",
        description: "Make an approved month final. This cannot be undone",
        defaults: { hr: false, employee: false },
      },
    ],
  },

  {
    key: "tasks",
    label: "Tasks",
    description: "Task board for the company",
    path: "/tasks",
    defaults: { hr: true, employee: true },
    sections: [
      {
        key: "viewAll",
        label: "All Tasks",
        description: "See everyone's tasks, not just their own",
        defaults: { hr: true, employee: false },
      },
      {
        key: "progress",
        label: "Task Progress",
        description: "Status distribution across tasks",
        defaults: { hr: true, employee: false },
      },
      {
        key: "workload",
        label: "Team Workload",
        description: "Assigned work per employee",
        defaults: { hr: true, employee: false },
      },
      {
        key: "urgent",
        label: "Urgent & Overdue",
        description: "Overdue and high priority tasks",
        defaults: { hr: true, employee: false },
      },
      {
        key: "recent",
        label: "Recent Tasks",
        description: "Latest task activity",
        defaults: { hr: true, employee: false },
      },
      {
        key: "activity",
        label: "Task Activity",
        description: "View task activity/history",
        defaults: { hr: true, employee: true },
      },
      {
        key: "create",
        label: "Create Task",
        description: "Assign a new task to an employee",
        defaults: { hr: true, employee: false },
      },
      {
        key: "createOwn",
        label: "Create Own Task",
        description: "Create a task for themselves",
        defaults: { hr: true, employee: true },
      },
      {
        key: "update",
        label: "Update Task",
        description: "Edit an existing task",
        defaults: { hr: true, employee: false },
      },
      {
        key: "updateOwn",
        label: "Update Own Task",
        description: "Edit a task they created",
        defaults: { hr: true, employee: true },
      },
      {
        key: "delete",
        label: "Delete Task",
        description: "Remove a task",
        defaults: { hr: true, employee: false },
      },
    ],

  },

];

/*
|--------------------------------------------------------------------------
| Lookups
|--------------------------------------------------------------------------
| Built once from the list above so a check never walks the registry.
|--------------------------------------------------------------------------
*/

const PAGE_MAP = PERMISSION_PAGES.reduce((map, page) => {
  map[page.key] = page;
  return map;
}, {});

export const getPageDefinition = (pageKey) =>
  PAGE_MAP[pageKey] || null;

export const getSectionDefinition = (pageKey, sectionKey) =>
  getPageDefinition(pageKey)?.sections?.find(
    (section) => section.key === sectionKey
  ) || null;

export const hasSections = (pageKey) =>
  Boolean(getPageDefinition(pageKey)?.sections?.length);

/*
| A dotted path split into the page and the section it addresses. A path with
| no dot is a page on its own.
*/

export const parsePermissionPath = (path = "") => {

  const [pageKey, sectionKey] = String(path).split(".");

  return {
    pageKey: pageKey || "",
    sectionKey: sectionKey || "",
  };

};
