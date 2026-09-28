import {
  FiCheckCircle,
  FiLayers,
  FiLoader,
  FiMoreHorizontal,
} from "react-icons/fi";

/*
|--------------------------------------------------------------------------
| Task Summary Cards
|--------------------------------------------------------------------------
| Ginti khud nahi karta — taskUtils.js ke taskSummary() se banaya hua object
| leta hai.
|
| Teen cards wahi hain jo owner ko roz dekhne hote hain: kul kitna kaam hai,
| kya chal raha hai, aur kitna nipat chuka hai.
| To Do ki poori distribution TaskProgress section mein hai.
|
| Panel `.ui-card` hai — wahi jo Dashboard ke cards, Task overview aur baaki
| har section use karta hai. Isliye theme badalne par ye saath badalte hain
| aur poore app se mel khaate hain; yahan ek bhi `dark:` nahi likhna padta.
|
| Text ke saare rang tokens se hain (ink / ink-subtle / ink-faint), aur har
| card ke hue ke liye wahi Tailwind jodi jo project mein har jagah chalti hai
| — `bg-violet-50 text-violet-600 ring-violet-200`. index.css un teenon ka
| dark rupantar pehle se rakhta hai, isliye light mein ye halke tinted chip
| hain aur dark mein gehre.
|
| Hue teen hain — violet, blue (project mein indigo par point karta hai,
| yaani brand), aur emerald. Rang icon
| par bhi hai, kone ke wash par bhi aur neeche ki curve par bhi, isliye card
| ka matlab rang se pehchanne wale ko kuch naya seekhna nahi padta.
|
| Neeche wali curve SIRF sajaavat hai, data nahi: app kisi bhi ginti ka
| itihaas rakhti hi nahi, to yahan dikhane ko trend hai hi nahi. Isliye wo
| har card par ek tay curve hai, aria-hidden, bina axis/point ke — taaki koi
| use padhne ki koshish na kare.
|--------------------------------------------------------------------------
*/

function TaskSummaryCards({ summary }) {
  const total = summary.total || 0;

  // Kitne percent — total 0 ho to 0, warna divide by zero NaN de dega
  const percent = (value) => (total ? Math.round((value / total) * 100) : 0);

  const cards = [
    {
      key: "total",
      title: "Total tasks",
      value: summary.total,
      percentage: 100,
      subtitle: "Total assigned",
      icon: <FiLayers />,
      // Icon ka chip — teenon ka dark rupantar index.css mein hai
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
      iconRing: "ring-violet-200",
      /*
      | Kone par pada rang ka wash. Opacity par hai, kisi tay shade par nahi,
      | isliye light mein wo halki si rangat hai aur dark mein wahi rang
      | gehre panel par chamak jaata hai — ek hi class dono jagah theek.
      */
      glow: "bg-violet-500/15",
      // Sparkline ka stroke — 500 mid-tone hai, dono theme mein padhne layak
      line: "text-violet-500",
      // Har card ki apni curve — sirf isliye ki teenon ek jaise na dikhein
      path: "M0 26 C 14 20, 24 10, 38 12 S 62 24, 76 15 S 104 6, 120 10",
    },
    {
      key: "active",
      title: "In progress",
      value: summary.active,
      percentage: percent(summary.active),
      subtitle: "Being worked on",
      icon: <FiLoader />,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      iconRing: "ring-blue-200",
      glow: "bg-blue-500/15",
      line: "text-blue-500",
      path: "M0 24 C 18 22, 26 14, 40 16 S 60 10, 76 12 S 100 4, 120 6",
    },
    {
      key: "completed",
      title: "Completed",
      value: summary.completed,
      percentage: percent(summary.completed),
      subtitle: "Marked done",
      icon: <FiCheckCircle />,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      iconRing: "ring-emerald-200",
      glow: "bg-emerald-500/15",
      line: "text-emerald-500",
      path: "M0 22 C 16 24, 26 12, 40 14 S 62 8, 78 14 S 104 8, 120 4",
    },
  ];

  return (
    <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
      {cards.map((card) => (
        /*
          `ui-card` + `ui-card-interactive` — wahi panel aur wahi hover jo
          Dashboard ke tiles par hai, isliye hover ka jhukav poore app mein
          ek jaisa rehta hai. Padding kit ki `ui-card-body` se nahi li:
          neeche ki curve ko kinare tak jaana hai, aur uske liye padding ka
          naap pata hona chahiye (p-5 ↔ -mx-5 -mb-5).
        */
        <div
          key={card.key}
          className="ui-card ui-card-interactive group relative flex flex-col overflow-hidden p-5"
        >
          {/* Kone par rang ka wash — icon ke peeche se uthta hua */}
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute -left-12 -top-16 h-40 w-40 rounded-full opacity-70 blur-3xl transition-opacity duration-300 group-hover:opacity-100 ${card.glow}`}
          />

          {/* Icon + title ek hi kataar mein, decorative menu daayein kinare */}
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ring-1 ring-inset ${card.iconBg} ${card.iconColor} ${card.iconRing}`}
              >
                {card.icon}
              </span>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {card.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-ink-subtle">
                  {card.subtitle}
                </p>
              </div>
            </div>

            {/*
              Sirf sajaavat — na button hai, na iska koi menu. Isliye
              aria-hidden: screen reader ke liye yahan kuch hai hi nahi.
            */}
            <FiMoreHorizontal
              aria-hidden="true"
              className="shrink-0 text-lg text-ink-faint transition-colors group-hover:text-ink-subtle"
            />
          </div>

          {/*
            Ginti aur uske baaju mein wahi percent jo pehle progress bar ke
            upar likha tha. Baseline par jode hain, isliye do alag size ke ank
            ek hi lakeer par baithte hain; tabular-nums se ginti badalne par
            label hilta nahi.
          */}
          <div className="relative mt-5 flex items-baseline gap-2">
            <span className="text-4xl font-bold leading-none tracking-tight text-ink tabular-nums">
              {card.value}
            </span>

            <span className="text-xs font-semibold text-ink-subtle tabular-nums">
              {card.percentage}%
            </span>
          </div>

          {/*
            Sajaavati curve. mt-auto isliye ki teenon cards mein ye hamesha
            sabse neeche baithe, chahe upar ka title ek line le ya do.
            -mx-5 -mb-5 se wo card ke kinaron tak jaati hai.
          */}
          <div className="relative -mx-5 -mb-5 mt-auto pt-4">
            <svg
              aria-hidden="true"
              viewBox="0 0 120 32"
              preserveAspectRatio="none"
              className={`h-14 w-full ${card.line}`}
            >
              <defs>
                {/* id har card par alag — warna doosra card pehle wale ka
                    gradient utha leta hai */}
                <linearGradient
                  id={`task-spark-${card.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="currentColor"
                    stopOpacity="0.22"
                  />
                  <stop
                    offset="100%"
                    stopColor="currentColor"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>

              {/* Curve ke neeche ka bhraav — wahi path, band karke */}
              <path
                d={`${card.path} L 120 32 L 0 32 Z`}
                fill={`url(#task-spark-${card.key})`}
              />

              {/*
                vector-effect — preserveAspectRatio="none" curve ko chaudai ke
                saath kheenchta hai, aur uske bina stroke bhi khinch kar mota
                ho jaata hai
              */}
              <path
                d={card.path}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}

export default TaskSummaryCards;
