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
  // Paused narangi hai — ruka hua kaam dikhna chahiye, par laal sirf
  // khatre ke liye bacha hai (overdue, High priority)
  Paused: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200",
  Completed:
    "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
};

export const STATUS_DOTS = {
  "To Do": "bg-slate-400",
  "In Progress": "bg-blue-500",
  Paused: "bg-orange-500",
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
  // Paused narangi hai taaki wo Overdue/High wali laal chetavani se alag
  // dikhe — ruka hua kaam khatra nahi hai
  Paused: "bg-orange-500",
  Completed: "bg-emerald-500",
  Overdue: "bg-red-500",
};

/*
| Dashboard sections ka common card. Ye ab apni classes khud nahi likhta —
| `.ui-card` wahi panel hai jo Dashboard ke teeno card (Today's Tasks, Quick
| Find, Upcoming Holidays) use karte hain, isliye /tasks ka panel unse
| hu-ba-hu milta hai aur theme badalne par saath badalta hai.
*/
export const SECTION_CARD_CLASS = "ui-card overflow-hidden";

// Filter dropdown ka pehla option — kisi bhi status se match nahi karta
export const ALL_STATUSES = "All statuses";

/*
| Upar ke tabs — wo listen jo log roz kholte hain. Har tab sirf ek filter
| hai, alag data nahi; "archived" hi ek hai jo server se alag aata hai.
|
| needs: is tab ke liye kya chahiye — page usi se tab chhupata hai, taaki
| Employee ko "Assigned by me" jaisa bekaar tab na dikhe.
*/
export const TASK_VIEWS = [
  { key: "all", label: "All tasks", needs: "viewAll" },
  { key: "mine", label: "My tasks", needs: "employee" },
  { key: "assigned", label: "Assigned by me", needs: "create" },
  { key: "overdue", label: "Overdue", tone: "danger" },
  { key: "completed", label: "Completed" },
  { key: "archived", label: "Archived", needs: "archive" },
];

export const DUE_FILTERS = [
  { value: "", label: "Any time" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "week", label: "Next 7 days" },
  { value: "none", label: "No due date" },
];

export const SORT_OPTIONS = [
  { value: "due", label: "Due date" },
  { value: "priority", label: "Priority" },
  { value: "updated", label: "Recently updated" },
  { value: "created", label: "Newest first" },
];

// Ek page par kitni rows — pehle 5 thi, jisme har doosra click "next" hota
export const TASK_PAGE_SIZE = 10;

/*
| Avatar ke rang — naam se tay hote hain (hash), isliye ek insaan har jagah
| ek hi rang mein dikhta hai. Wahi tint jodi jo badges ki hai.
*/
export const AVATAR_TONES = [
  "bg-blue-50 text-blue-700 ring-blue-200",
  "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "bg-amber-50 text-amber-700 ring-amber-200",
  "bg-violet-50 text-violet-700 ring-violet-200",
  "bg-rose-50 text-rose-700 ring-rose-200",
  "bg-teal-50 text-teal-700 ring-teal-200",
  "bg-orange-50 text-orange-700 ring-orange-200",
  "bg-sky-50 text-sky-700 ring-sky-200",
];

// Form ki khaali haalat — reset karte waqt bhi yahi lagti hai
export const EMPTY_TASK_FORM = {
  title: "",
  description: "",
  assignedTo: "",
  members: [],
  dueDate: "",
  priority: DEFAULT_PRIORITY,
};

// Description ki hadd — rules.js ke taskDescription se match karti hai
export const DESCRIPTION_LIMIT = 500;

/*
| Form ke inputs ka common look. Shape wahi hai jo pehle thi — sirf rang ab
| semantic tokens se aate hain (surface / line / ink / brand), wahi jo
| Dashboard aur UI kit ki `.ui-field` use karti hai.
|
| `.ui-field` ka istemaal seedha nahi kiya: uska focus rule utilities ke
| BAAD emit hota hai, isliye error wale field par laal focus ring dabb
| jaati. Dono variants ek hi tarah likhe hain, to farq sirf hue ka rehta hai.
*/
export const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-line bg-surface px-4 text-sm font-normal text-ink outline-none transition-all placeholder:text-ink-faint focus:border-brand focus:ring-3 focus:ring-brand-ring";

export const ERROR_INPUT_CLASS =
  "h-11 w-full rounded-xl border border-red-300 bg-surface px-4 text-sm font-normal text-ink outline-none transition-all placeholder:text-ink-faint focus:border-red-500 focus:ring-3 focus:ring-red-100";

/*
| Primary button — UI kit ka apna, wahi jo Dashboard ke "Create a task" par
| lagta hai. Ek hi height, ek hi radius, ek hi weight; sirf bhraav badalta
| hai. Yahan koi padding/weight utility nahi jodi: kit ki classes kisi
| Tailwind layer mein nahi hain, isliye wo utilities se jeet jaati hain aur
| jodi hui class chup-chaap bekaar padi rehti.
*/
export const PRIMARY_BUTTON_CLASS = "ui-btn ui-btn-primary";
