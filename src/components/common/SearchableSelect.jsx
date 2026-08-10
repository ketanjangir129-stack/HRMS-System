import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiChevronDown, FiSearch, FiX } from "react-icons/fi";

/*
|--------------------------------------------------------------------------
| Searchable Select
|--------------------------------------------------------------------------
| A stand in for a native <select> whose option list grows with the company.
| The list is typed into instead of scrolled through, only a bounded number of
| matches is ever rendered, and every row is truncated, so a directory of a
| hundred employees looks and behaves the same as one of five.
|
| The panel is portalled to the body and positioned against the trigger, so a
| modal body or a table that clips its own overflow cannot cut it in half. It
| flips above the trigger when there is more room there.
|--------------------------------------------------------------------------
*/

/*
| Past this many matches the list stops rendering rows and asks for a narrower
| search — a list that long is not usable by scrolling anyway.
*/
const MAX_RENDERED_OPTIONS = 100;

const PANEL_MAX_HEIGHT = 300;

const SPACE_AROUND_TRIGGER = 6;

/*
| Search matches on every word typed, in any order, against the label and the
| hint together — "ketan tech" and "tech ketan" both find the same row.
*/
const getSearchTerms = (query) =>
  query.trim().toLowerCase().split(/\s+/).filter(Boolean);

const optionMatches = (option, terms) => {

  const haystack = `${option.label ?? ""} ${option.hint ?? ""}`.toLowerCase();

  return terms.every((term) => haystack.includes(term));

};

const getPanelStyle = (rect) => {

  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;

  const openUp = spaceBelow < PANEL_MAX_HEIGHT && spaceAbove > spaceBelow;

  const available =
    (openUp ? spaceAbove : spaceBelow) - SPACE_AROUND_TRIGGER * 2;

  return {
    position: "fixed",
    left: rect.left,
    width: rect.width,
    maxHeight: Math.max(180, Math.min(PANEL_MAX_HEIGHT, available)),
    ...(openUp
      ? { bottom: window.innerHeight - rect.top + SPACE_AROUND_TRIGGER }
      : { top: rect.bottom + SPACE_AROUND_TRIGGER }),
  };

};

function SearchableSelect({
  options = [],
  value = "",
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No matches found",
  disabled = false,
  allowClear = false,
  className = "",
  ariaLabel,
  id,
}) {

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelStyle, setPanelStyle] = useState(null);

  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const selected = useMemo(
    () => options.find((option) => option.value === value) || null,
    [options, value]
  );

  const filtered = useMemo(() => {

    const terms = getSearchTerms(query);

    if (!terms.length) return options;

    return options.filter((option) => optionMatches(option, terms));

  }, [options, query]);

  const visible = filtered.slice(0, MAX_RENDERED_OPTIONS);
  const hiddenCount = filtered.length - visible.length;

  /*
  | Position is measured from the trigger, so it has to be recalculated
  | whenever anything under the panel moves — a scrolling modal body counts,
  | hence the capture phase listener.
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

  useEffect(() => {

    if (!open) return;

    inputRef.current?.focus();

  }, [open]);

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

  /*
  | Keep the highlighted row inside the visible part of the list while the
  | arrow keys move it.
  */
  useEffect(() => {

    if (!open) return;

    const row = listRef.current?.children?.[activeIndex];

    row?.scrollIntoView({ block: "nearest" });

  }, [open, activeIndex]);

  const openPanel = () => {

    if (disabled) return;

    setQuery("");

    const selectedIndex = options.findIndex(
      (option) => option.value === value
    );

    setActiveIndex(selectedIndex > 0 ? selectedIndex : 0);
    setOpen(true);

  };

  const closePanel = ({ focusTrigger = true } = {}) => {

    setOpen(false);
    setQuery("");

    if (focusTrigger) triggerRef.current?.focus();

  };

  const selectOption = (option) => {

    onChange?.(option.value);
    closePanel();

  };

  const handleTriggerKeyDown = (event) => {

    if (open) return;

    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      openPanel();
    }

  };

  const handleSearchKeyDown = (event) => {

    if (event.key === "ArrowDown") {

      event.preventDefault();

      setActiveIndex((previous) =>
        visible.length ? Math.min(previous + 1, visible.length - 1) : 0
      );

      return;
    }

    if (event.key === "ArrowUp") {

      event.preventDefault();
      setActiveIndex((previous) => Math.max(previous - 1, 0));

      return;
    }

    if (event.key === "Enter") {

      event.preventDefault();

      const option = visible[activeIndex];

      if (option) selectOption(option);

      return;
    }

    if (event.key === "Escape") {

      event.preventDefault();
      closePanel();

      return;
    }

    if (event.key === "Tab") closePanel({ focusTrigger: false });

  };

  const handleSearchChange = (event) => {

    setQuery(event.target.value);
    setActiveIndex(0);

  };

  const handleClear = (event) => {

    event.stopPropagation();
    onChange?.("");

  };

  const showClear = allowClear && !disabled && value !== "" && value != null;

  return (
    <>

      <button
        type="button"
        id={id}
        ref={triggerRef}
        disabled={disabled}
        onClick={() => (open ? closePanel() : openPanel())}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`${className} flex items-center gap-2 text-left`}
      >

        <span
          className={`min-w-0 flex-1 truncate ${selected ? "" : "text-slate-400"
            }`}
        >
          {selected ? selected.label : placeholder}
          {selected?.hint && (
            <span className="ml-1 font-normal text-slate-400">
              {selected.hint}
            </span>
          )}
        </span>

        {showClear && (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear selection"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleClear}
            className="shrink-0 rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
          >
            <FiX size={14} />
          </span>
        )}

        <FiChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""
            }`}
        />

      </button>

      {open && panelStyle &&
        createPortal(
          <div
            ref={panelRef}
            style={panelStyle}
            className="z-[100] flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
          >

            <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-3 py-2">

              <FiSearch size={15} className="shrink-0 text-slate-400" />

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                className="w-full min-w-0 bg-transparent text-sm font-normal text-slate-700 outline-none placeholder:text-slate-400"
              />

            </div>

            <ul
              ref={listRef}
              role="listbox"
              className="min-h-0 flex-1 overflow-y-auto py-1"
            >

              {visible.map((option, index) => {

                const isSelected = option.value === value;

                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectOption(option)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${index === activeIndex ? "bg-blue-50" : "bg-white"
                      }`}
                  >

                    <span
                      className={`min-w-0 flex-1 truncate font-normal ${isSelected
                        ? "font-semibold text-blue-700"
                        : "text-slate-700"
                        }`}
                    >
                      {option.label}
                      {option.hint && (
                        <span className="ml-1 text-xs font-normal text-slate-400">
                          {option.hint}
                        </span>
                      )}
                    </span>

                    {isSelected && (
                      <FiCheck size={15} className="shrink-0 text-blue-600" />
                    )}

                  </li>
                );

              })}

              {!visible.length && (
                <li className="px-3 py-6 text-center text-sm font-normal text-slate-500">
                  {emptyMessage}
                </li>
              )}

            </ul>

            {hiddenCount > 0 && (
              <p className="shrink-0 border-t border-slate-100 px-3 py-2 text-xs font-normal text-slate-500">
                Showing {visible.length} of {filtered.length} — keep typing to
                narrow the list.
              </p>
            )}

          </div>,
          document.body
        )}

    </>
  );

}

export default SearchableSelect;
