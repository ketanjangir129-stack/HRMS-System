import { FiCheck, FiMinus } from "react-icons/fi";

/*
|--------------------------------------------------------------------------
| Permission Checkbox
|--------------------------------------------------------------------------
| One switch, in the two sizes the screen uses: the group header and the
| sections under it.
|
| The native input is kept and only visually replaced, so the box is still
| focusable, still toggles on space and still reads as a checkbox to a screen
| reader. `indeterminate` cannot be set from markup, so the dash is drawn
| rather than set on the element.
|
| An 18px box is a fine mouse target and a poor thumb one, so below `sm` the
| wrapper is padded and the same amount pulled back off as negative margin.
| The input fills that padded box, which puts the phone target near 40px while
| the drawn box and every gap around it stay exactly where they were - the two
| cancel, so nothing in the rows outside this file moves.
|
| Padding the wrapper rather than stretching the input is deliberate: an
| absolutely positioned checkbox is a replaced element, so offsets alone leave
| it at its intrinsic size instead of growing it to meet them.
|--------------------------------------------------------------------------
*/

const SIZES = {
  sm: { box: "h-[18px] w-[18px] rounded-[6px]", icon: 12 },
  md: { box: "h-[22px] w-[22px] rounded-[7px]", icon: 15 },
};

function PermissionCheckbox({
  checked = false,
  indeterminate = false,
  disabled = false,
  onChange,
  size = "sm",
  ariaLabel,
}) {

  const { box, icon } = SIZES[size] || SIZES.sm;

  const active = checked || indeterminate;

  return (
    <span className="relative -m-2.5 inline-flex shrink-0 items-center justify-center p-2.5 sm:m-0 sm:p-0">

      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(event) => onChange?.(event.target.checked)}
        className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />

      <span
        aria-hidden="true"
        className={`flex items-center justify-center border transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-400 peer-focus-visible:ring-offset-2 ${box} ${
          active
            ? "border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-600/30"
            : "border-slate-300 bg-white text-transparent peer-hover:border-blue-400"
        } ${disabled ? "opacity-40" : ""}`}
      >

        {indeterminate ? (
          <FiMinus size={icon} strokeWidth={3} />
        ) : (
          checked && <FiCheck size={icon} strokeWidth={3} />
        )}

      </span>

    </span>
  );

}

export default PermissionCheckbox;
