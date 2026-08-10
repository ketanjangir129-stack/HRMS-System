/*
|--------------------------------------------------------------------------
| Task Constants
|--------------------------------------------------------------------------
| Sirf values — koi logic nahi. Status ke naam taskService.js mein hain
| (kyunki DB mein wahi save hote hain), yahan sirf unke rang aur UI ki
| chhoti-moti cheezein.
|--------------------------------------------------------------------------
*/

/*
| Badge ke rang — attendance module jaisa hi: halka background, gehra text,
| aur ek chhota dot jo rang ko dohrata hai.
| Keys TASK_STATUSES se match honi chahiye — naya status jodo to yahan bhi jodo.
*/

export const STATUS_STYLES = {
  "To Do": "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200",
  "In Progress": "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  Completed:
    "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
};

export const STATUS_DOTS = {
  "To Do": "bg-slate-400",
  "In Progress": "bg-blue-500",
  Completed: "bg-emerald-500",
};

export const PRIORITIES = ["Low", "Medium", "High"];

export const DEFAULT_PRIORITY = "Medium";

export const PRIORITY_STYLES = {
  High: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
  Medium: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  Low: "bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200",
};

export const PRIORITY_DOTS = {
  High: "bg-red-500",
  Medium: "bg-amber-500",
  Low: "bg-slate-400",
};

/*
| Progress bars ke rang. Jaan-boojhkar STATUS_DOTS jaise hi rakhe hain taaki
| bar ka rang uske badge ke dot se match kare.
|
| Overdue koi status nahi hai — wo pending tasks ka subset hai. Yahan iska
| rang sirf "attention row" ke liye hai, stacked bar mein wo nahi aata.
*/
export const PROGRESS_BARS = {
  "To Do": "bg-slate-400",
  "In Progress": "bg-blue-500",
  Completed: "bg-emerald-500",
  Overdue: "bg-red-500",
};

// Dashboard sections ka common white card — pehle ye string AllTasks mein
// hardcoded thi, ab TaskSectionCard isi se banta hai
export const SECTION_CARD_CLASS =
  "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm";

// Dashboard lists (Urgent / Recent) mein kitni rows dikhein
export const SECTION_ROW_LIMIT = 5;

// Filter dropdown ka pehla option — kisi bhi status se match nahi karta
export const ALL_STATUSES = "All statuses";

/*
| Dashboard section ka "View all" table ko usi section ki list par le jaata
| hai. Khaali string matlab koi context nahi — poori list.
*/
export const TASK_CONTEXT = {
  ALL: "",
  URGENT: "urgent",
  RECENT: "recent",
};

export const TASK_CONTEXT_LABELS = {
  [TASK_CONTEXT.URGENT]: "Urgent & overdue",
  [TASK_CONTEXT.RECENT]: "Recent tasks",
};

// Form ki khaali haalat — reset karte waqt bhi yahi lagti hai
export const EMPTY_TASK_FORM = {
  title: "",
  description: "",
  assignedTo: "",
  dueDate: "",
  priority: DEFAULT_PRIORITY,
};

// Description ki hadd — rules.js ke taskDescription se match karti hai
export const DESCRIPTION_LIMIT = 500;

// Form ke inputs ka common look — attendance ke FilterSelect jaisa
export const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-normal text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export const ERROR_INPUT_CLASS =
  "h-11 w-full rounded-xl border border-red-300 bg-white px-4 text-sm font-normal text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-100";

// Primary button — attendance ke "Mark Attendance" jaisa
export const PRIMARY_BUTTON_CLASS =
  "inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";
