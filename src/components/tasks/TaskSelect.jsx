import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiChevronDown } from "react-icons/fi";

/*
|--------------------------------------------------------------------------
| Task Select
|--------------------------------------------------------------------------
| Chhoti, tay list wale fields ka dropdown — Priority jaisa, jahan sirf teen
| option hain.
|
| Native <select> yahan use nahi karte: uska khula hua list OS banata hai
| (Windows par gehra neela highlight, apna font), CSS uspar chalti hi nahi.
| Baaki poora form rounded, slate aur blue hai — beech mein wo list begaani
| lagti hai. Yahan list bhi apni hi hai, isliye har jagah ek jaisi dikhti hai.
|
| Search box jaan-boojhkar nahi hai — teen option ke liye common/SearchableSelect
| bhaari padta hai. Lambi, badhti hui list (employees) ke liye wahi sahi hai.
|
| Panel body mein portal hota hai. Modal ka body scroll karta hai aur uska
| overflow clip karta hai — andar hi rakhte to Priority (sabse neeche wala
| field) ka dropdown aadha kat jaata.
|--------------------------------------------------------------------------
*/

const PANEL_MAX_HEIGHT = 260;

// Trigger aur panel ke beech ki thodi si hawa
const PANEL_GAP = 6;

/*
| Panel trigger jitna chaura hota hai, par itna chhota nahi ki "In Progress"
| do line mein toot jaye — table ka badge trigger sirf ek pill jitna chaura
| hai, isliye ye farsh chahiye.
*/
const PANEL_MIN_WIDTH = 170;

// Screen ke kinare se itna gap hamesha bacha rehta hai
const SCREEN_MARGIN = 8;

/*
| Neeche jagah kam ho to panel upar khulta hai. Dono taraf tang ho to jis
| taraf zyada jagah hai wahi jeet jaati hai, aur maxHeight utni hi rehti hai
| jitni jagah bachi hai — panel screen se bahar nahi jaata.
|
| Chaudai badhne par daayein kinare wala trigger (table ki status column)
| screen ke bahar chala jaata, isliye left ko andar kheench lete hain.
*/
const getPanelStyle = (rect) => {
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;

  const openUp = spaceBelow < PANEL_MAX_HEIGHT && spaceAbove > spaceBelow;

  const available = (openUp ? spaceAbove : spaceBelow) - PANEL_GAP * 2;

  const width = Math.max(rect.width, PANEL_MIN_WIDTH);

  const maxLeft = window.innerWidth - width - SCREEN_MARGIN;

  return {
    position: "fixed",
    left: Math.max(SCREEN_MARGIN, Math.min(rect.left, maxLeft)),
    width,
    maxHeight: Math.max(120, Math.min(PANEL_MAX_HEIGHT, available)),
    ...(openUp
      ? { bottom: window.innerHeight - rect.top + PANEL_GAP }
      : { top: rect.bottom + PANEL_GAP }),
  };
};

/*
| options: [{ value, label, dot }] — dot ek Tailwind bg class hai (jaise
| PRIORITY_DOTS se), taaki row ka rang wahi rahe jo badge ka hai. Chhoda ja
| sakta hai; tab sirf label dikhta hai.
|
| className trigger par lagta hai — page apni INPUT_CLASS deta hai, isliye
| ye field baaki fields se hu-ba-hu milta hai.
|
| trigger diya ho to button ke andar wahi aata hai, default label+chevron ki
| jagah. Table mein status ka trigger ek badge hai — wahan field jaisa box
| nahi chahiye, sirf rangeen pill.
*/
function TaskSelect({
  options = [],
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  className = "",
  trigger,
  ariaLabel,
  id,
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelStyle, setPanelStyle] = useState(null);

  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const selected = options.find((option) => option.value === value) || null;

  /*
  | Position trigger se naapi jaati hai, isliye jab bhi neeche kuch khiske
  | dobara naapni padti hai. Scroll capture phase mein sunte hain — modal ka
  | apna scrolling body window par scroll event nahi bhejta.
  */
  useLayoutEffect(() => {
    if (!open) return;

    const reposition = () => {
      const trigger = triggerRef.current;

      if (!trigger) return;

      setPanelStyle(getPanelStyle(trigger.getBoundingClientRect()));
    };

    reposition();

    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);

    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  // Bahar click par band. Trigger apne click se khud hi toggle karta hai,
  // isliye usko chhod dete hain — warna band karke turant khul jaata.
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event) => {
      if (
        triggerRef.current?.contains(event.target) ||
        panelRef.current?.contains(event.target)
      ) {
        return;
      }

      setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () =>
      document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const openPanel = () => {
    if (disabled) return;

    // Highlight wahin se shuru ho jo abhi chuna hua hai
    const selectedIndex = options.findIndex(
      (option) => option.value === value
    );

    setActiveIndex(selectedIndex > 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const closePanel = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const selectOption = (option) => {
    onChange?.(option.value);
    closePanel();
  };

  /*
  | Keyboard native select jaisa hi: band list par Arrow/Enter/Space kholte
  | hain, khuli list par Arrow chalata hai, Enter chunta hai, Escape band
  | karta hai. Focus trigger par hi rehta hai (panel mein koi input nahi),
  | isliye saara keyboard yahin handle hota hai.
  */
  const handleKeyDown = (event) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openPanel();
      }

      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((previous) =>
        Math.min(previous + 1, options.length - 1)
      );

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((previous) => Math.max(previous - 1, 0));

      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      const option = options[activeIndex];

      if (option) selectOption(option);

      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closePanel();

      return;
    }

    // Tab par focus aage jaana chahiye, isliye trigger par wapas nahi laate
    if (event.key === "Tab") setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        disabled={disabled}
        onClick={() => (open ? closePanel() : openPanel())}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`${className} ${
          trigger ? "" : "flex items-center gap-2 text-left"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {trigger || (
          <>
            <span
              className={`flex min-w-0 flex-1 items-center gap-2 truncate ${
                selected ? "" : "text-slate-400"
              }`}
            >
              {selected?.dot && (
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${selected.dot}`}
                />
              )}
              {selected ? selected.label : placeholder}
            </span>

            <FiChevronDown
              size={16}
              className={`shrink-0 text-slate-400 transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </>
        )}
      </button>

      {open &&
        panelStyle &&
        createPortal(
          <ul
            ref={panelRef}
            role="listbox"
            aria-label={ariaLabel}
            style={panelStyle}
            className="z-[100] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;

              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  // Trigger ka focus na jaye, warna list band hone par
                  // keyboard kahin ka nahi rehta
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(option)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${
                    index === activeIndex ? "bg-blue-50" : "bg-white"
                  }`}
                >
                  {option.dot && (
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${option.dot}`}
                    />
                  )}

                  <span
                    className={`min-w-0 flex-1 truncate ${
                      isSelected
                        ? "font-semibold text-blue-700"
                        : "font-normal text-slate-700"
                    }`}
                  >
                    {option.label}
                  </span>

                  {isSelected && (
                    <FiCheck size={15} className="shrink-0 text-blue-600" />
                  )}
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </>
  );
}

export default TaskSelect;
