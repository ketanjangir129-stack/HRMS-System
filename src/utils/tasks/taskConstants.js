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
  // Paused laal hai — ruka hua kaam turant aankh mein aana chahiye
  Paused: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
  Completed:
    "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
};

export const STATUS_DOTS = {
  "To Do": "bg-slate-400",
  "In Progress": "bg-blue-500",
  Paused: "bg-red-500",
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
  // Overdue jaisa hi laal — dono "ye ruka hua hai" wali baat kehte hain, aur
  // Overdue stacked bar mein aata bhi nahi, isliye takraav nahi hota
  Paused: "bg-red-500",
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
