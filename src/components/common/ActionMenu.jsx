import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiMoreVertical } from "react-icons/fi";

/*
|--------------------------------------------------------------------------
| Action Menu
|--------------------------------------------------------------------------
| The three dot button and the small menu it opens, for the actions a row or
| a card offers once there is no room to show them as buttons.
|
| The menu is portalled to the body and positioned against the trigger, the
| same way `SearchableSelect` does it: the panels these cards sit in clip
| their own overflow, so an absolutely positioned menu on the last card
| would be cut in half. It flips above the trigger when the space below is
| too short.
|--------------------------------------------------------------------------
*/

const GAP = 6;

// Enough to decide which side to open on before the menu has been measured.
const ROW_HEIGHT = 42;

const MENU_PADDING = 12;

function ActionMenu({ items = [], label = "More actions" }) {

    const [open, setOpen] = useState(false);
    const [style, setStyle] = useState(null);

    const triggerRef = useRef(null);
    const menuRef = useRef(null);

    useLayoutEffect(() => {

        if (!open) return;

        const rect = triggerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const height = items.length * ROW_HEIGHT + MENU_PADDING;

        const openUp =
            window.innerHeight - rect.bottom < height && rect.top > height;

        setStyle({
            position: "fixed",
            right: Math.max(GAP, window.innerWidth - rect.right),
            ...(openUp
                ? { bottom: window.innerHeight - rect.top + GAP }
                : { top: rect.bottom + GAP }),
        });

    }, [open, items.length]);

    useEffect(() => {

        if (!open) return;

        const handlePointerDown = (event) => {

            if (triggerRef.current?.contains(event.target)) return;
            if (menuRef.current?.contains(event.target)) return;

            setOpen(false);
        };

        const handleKeyDown = (event) => {
            if (event.key === "Escape") setOpen(false);
        };

        /*
        | The trigger moves with whatever is scrolling behind the menu, so the
        | menu is dismissed rather than left floating away from its button.
        */
        const close = () => setOpen(false);

        document.addEventListener("mousedown", handlePointerDown);
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("scroll", close, true);
        window.addEventListener("resize", close);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("resize", close);
        };

    }, [open]);

    // Nothing to offer — a button that opens an empty menu is worse than none.
    if (!items.length) return null;

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen((isOpen) => !isOpen)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={label}
                title={label}
                className={`inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 ${
                    open
                        ? "border-blue-500 bg-blue-50 text-blue-600"
                        : "border-slate-200 text-slate-500 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600"
                }`}
            >
                <FiMoreVertical size={16} />
            </button>

            {open &&
                style &&
                createPortal(
                    <div
                        ref={menuRef}
                        role="menu"
                        style={style}
                        className="z-50 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg shadow-slate-900/10"
                    >
                        {items.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                role="menuitem"
                                title={item.title || item.label}
                                onClick={() => {
                                    setOpen(false);
                                    item.onClick();
                                }}
                                className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-600"
                            >
                                <span className="shrink-0 text-slate-400">
                                    {item.icon}
                                </span>
                                {item.label}
                            </button>
                        ))}
                    </div>,
                    document.body
                )}
        </>
    );
}

export default ActionMenu;
