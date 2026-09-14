import {
  Laptop,
  Mail,
  Smartphone,
  Signal,
  Package,
} from "lucide-react";

import {
  EQUIPMENT_ITEMS,
  EQUIPMENT_STATUS,
  EQUIPMENT_STATUS_OPTIONS,
} from "../../utils/resignation/resignationConstants";

import { EquipmentStatusBadge } from "./common/ResignationStatusBadge";

/*
|--------------------------------------------------------------------------
| Equipment Checklist
|--------------------------------------------------------------------------
| The company's assets, one row each, in two modes:
|
|   editable  the employee declaring what they hold and what they returned
|   read only the same declaration as HR sees it on the settlement screen
|
| One component rather than two, because the read-only view is what HR prices
| an Asset Recovery against. If the two were separate files they would drift,
| and the drift would be between what somebody declared and what somebody
| else was charged for - which is the one difference this module cannot
| afford.
|
| The identifier field is the reason a row is worth more than a checkbox. A
| list of four yeses proves nothing; "Laptop returned, DL-5420-8891" is a
| record somebody can check against an asset register.
|--------------------------------------------------------------------------
*/

/* An icon per item, matched by key. A generic box stands in for an item
   added to the constants without one, so the list never breaks over a
   missing glyph. */
const ITEM_ICONS = {
  simCard: Signal,
  mailId: Mail,
  laptop: Laptop,
  mobile: Smartphone,
};

function EquipmentChecklist({
  items = {},
  errors = {},
  readOnly = false,
  onChange,
}) {

  const update = (key, field, value) => {

    if (readOnly || !onChange) return;

    onChange({
      ...items,
      [key]: {
        ...(items[key] || {}),
        [field]: value,
      },
    });

  };

  return (

    <div className="space-y-3">

      {EQUIPMENT_ITEMS.map((item) => {

        const Icon = ITEM_ICONS[item.key] || Package;

        const entry = items?.[item.key] || {};

        const error = errors?.[item.key];

        /*
        | The identifier is only asked for when something was actually
        | returned. Demanding a serial number for a laptop the employee was
        | never issued is the kind of required field that teaches people to
        | type "n/a" into forms.
        */
        const wantsIdentifier = entry.status === EQUIPMENT_STATUS.RETURNED;

        return (

          <div
            key={item.key}
            className={`rounded-2xl border p-4 transition-colors ${
              error ? "border-red-300 bg-red-50/40" : "border-line bg-surface"
            }`}
          >

            {/* Item header */}
            <div className="flex items-start justify-between gap-3">

              <div className="flex min-w-0 items-center gap-3">

                <span className="ui-tile-sm flex bg-surface-muted text-ink-subtle">
                  <Icon className="h-4 w-4" />
                </span>

                <div className="min-w-0">

                  <p className="text-sm font-bold text-ink">{item.label}</p>

                  <p className="mt-0.5 text-xs text-ink-faint">
                    {item.identifierLabel}
                  </p>

                </div>

              </div>

              {readOnly && <EquipmentStatusBadge status={entry.status} />}

            </div>

            {readOnly ? (

              /*
              | The read-only row prints only what was actually said. A
              | declaration full of "—" placeholders reads as a form somebody
              | failed to fill in rather than one where two fields did not
              | apply.
              */
              (entry.identifier || entry.remarks) && (

                <div className="mt-3 space-y-1.5 border-t border-line-subtle pt-3">

                  {entry.identifier && (
                    <p className="text-sm text-ink-muted">
                      <span className="text-ink-faint">
                        {item.identifierLabel}:{" "}
                      </span>
                      <span className="font-semibold text-ink">
                        {entry.identifier}
                      </span>
                    </p>
                  )}

                  {entry.remarks && (
                    <p className="text-sm text-ink-muted">
                      <span className="text-ink-faint">Remarks: </span>
                      {entry.remarks}
                    </p>
                  )}

                </div>

              )

            ) : (

              <div className="mt-4 space-y-3">

                {/* Status — three buttons rather than a select, because it is
                    the answer that matters most and it should be one tap. */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">

                  {EQUIPMENT_STATUS_OPTIONS.map((option) => (

                    <button
                      key={option}
                      type="button"
                      onClick={() => update(item.key, "status", option)}
                      className={`cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${
                        entry.status === option
                          ? "border-brand bg-blue-50 text-blue-700 ring-2 ring-brand-ring"
                          : "border-line text-ink-muted hover:border-blue-300 hover:bg-surface-muted"
                      }`}
                    >
                      {option}
                    </button>

                  ))}

                </div>

                {wantsIdentifier && (

                  <input
                    type="text"
                    value={entry.identifier || ""}
                    onChange={(e) =>
                      update(item.key, "identifier", e.target.value)
                    }
                    placeholder={item.placeholder}
                    aria-label={item.identifierLabel}
                    className="ui-field"
                  />

                )}

                <input
                  type="text"
                  value={entry.remarks || ""}
                  onChange={(e) => update(item.key, "remarks", e.target.value)}
                  placeholder="Remarks (optional) — condition, who it was handed to..."
                  aria-label={`${item.label} remarks`}
                  className="ui-field"
                />

                {error && (
                  <p className="text-xs font-medium text-red-500">{error}</p>
                )}

              </div>

            )}

          </div>

        );

      })}

    </div>

  );

}

export default EquipmentChecklist;
