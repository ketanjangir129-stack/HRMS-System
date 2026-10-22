import { useState } from "react";
import { FiLoader, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import { uploadReceiptApi } from "../../services/api/reimbursementApi";
import {
  REIMBURSEMENT_CATEGORIES,
  MAX_TRIP_EXPENSES,
} from "../../utils/reimbursement/reimbursementConstants";
import {
  TRAVEL_MODES,
  FOOD_ORDER_TYPES,
  ONLINE_FOOD_PLATFORMS,
  FUEL_KM_PER_LITRE,
  METER_DIGITS,
  MAX_BILL_IMAGES,
  createEmptyExpense,
  fuelMetrics,
  normalizeMeterReading,
  validateExpenseRow,
} from "../../utils/reimbursement/reimbursementFields";
import {
  formatAmount,
  hasErrors,
} from "../../utils/reimbursement/reimbursementUtils";

const IMAGE_CATEGORIES = ["Travel", "Food", "Stay", "Medical", "Other"];

function Field({ label, required = false, error, hint, className = "", children }) {
  return (
    <div className={className}>
      <label className="ui-eyebrow mb-1.5 block">
        {label}
        {required ? " *" : ""}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-500">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>
      )}
    </div>
  );
}

function PreviewTile({ url, alt, onRemove }) {
  return (
    <div className="group relative">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        title="Open full image"
        className="block overflow-hidden rounded-lg border border-line bg-surface"
      >
        <img src={url} alt={alt} className="h-20 w-full object-cover transition-transform duration-200 group-hover:scale-105" />
      </a>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove image"
        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface text-ink-subtle shadow-sm transition-colors hover:text-red-500"
      >
        <FiX size={12} />
      </button>
    </div>
  );
}

function UploadTile({ label = "Add", uploading = 0, multiple = true, disabled = false, onFiles }) {
  const busy = uploading > 0;
  return (
    <label
      className={`flex h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line text-ink-faint transition-colors hover:border-brand hover:text-brand ${
        busy || disabled ? "pointer-events-none opacity-60" : ""
      }`}
    >
      {busy ? <FiLoader className="animate-spin" size={16} /> : <FiPlus size={16} />}
      <span className="text-[10px] font-semibold">
        {busy ? `Uploading${uploading > 1 ? ` ${uploading}` : ""}...` : label}
      </span>
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        disabled={busy || disabled}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function ImagesPanel({
  label,
  images = [],
  uploading = 0,
  max = MAX_BILL_IMAGES,
  error,
  hint,
  onAdd,
  onRemove,
}) {
  const remaining = Math.max(0, max - images.length);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="ui-eyebrow">{label}</p>
        <span className="text-[10px] font-semibold text-ink-faint">
          {images.length}/{max}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-2">
        {images.map((url, index) => (
          <PreviewTile
            key={`${url}-${index}`}
            url={url}
            alt={`${label} ${index + 1}`}
            onRemove={() => onRemove(index)}
          />
        ))}
        {remaining > 0 && (
          <UploadTile
            label="Add images"
            uploading={uploading}
            disabled={uploading > 0}
            onFiles={onAdd}
          />
        )}
      </div>
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-500">{error}</p>
      ) : (
        hint && <p className="mt-1 text-[11px] text-ink-faint">{hint}</p>
      )}
    </div>
  );
}

function SingleImagePanel({ label, value, uploading = 0, error, hint, onUpload, onRemove }) {
  return (
    <div>
      <p className="ui-eyebrow mb-2">{label}</p>
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-2">
        {value ? (
          <PreviewTile url={value} alt={label} onRemove={onRemove} />
        ) : (
          <UploadTile
            label="Upload"
            multiple={false}
            uploading={uploading}
            disabled={uploading > 0}
            onFiles={(files) => onUpload(files[0])}
          />
        )}
      </div>
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-500">{error}</p>
      ) : (
        hint && <p className="mt-1 text-[11px] text-ink-faint">{hint}</p>
      )}
    </div>
  );
}

function ExpenseRow({
  index,
  row,
  errors = {},
  uploading = { index: null, field: "", count: 0 },
  onChange,
  onReplace,
  onAddImages,
  onUploadSingle,
  onRemoveImage,
  onRemoveSingle,
  onRemove,
  removable,
}) {
  const readingHint = `Enter the first ${METER_DIGITS} digits of the odometer.`;
  const metrics = fuelMetrics(row);
  const uploadCount = (field) =>
    uploading.index === index && uploading.field === field ? uploading.count : 0;
  const amountField = (value, onValueChange) => (
    <input
      type="number"
      min="0"
      step="0.01"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      placeholder="0.00"
      className="ui-field"
    />
  );
  const billImages = Array.isArray(row.receiptUrls) ? row.receiptUrls : [];

  return (
    <div className="rounded-xl border border-line bg-surface-muted p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-subtle">Expense #{index + 1}</p>
        {removable && (
          <button type="button" onClick={onRemove} className="ui-icon-btn" aria-label="Remove expense">
            <FiTrash2 size={16} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0 space-y-3">
          <Field label="Category" required error={errors.category} className="sm:max-w-xs">
            <select
              value={row.category}
              onChange={(e) => onReplace(createEmptyExpense(e.target.value))}
              className="ui-field"
            >
              <option value="">Select category</option>
              {REIMBURSEMENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </Field>

          {!row.category && (
            <p className="text-sm text-ink-subtle">
              Select a category to see the fields finance needs for it.
            </p>
          )}

          {row.category === "Travel" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Travel From" required error={errors.travelFrom}>
                <input
                  value={row.travelFrom}
                  onChange={(e) => onChange({ travelFrom: e.target.value })}
                  placeholder="e.g. Pune"
                  className="ui-field"
                />
              </Field>
              <Field label="Travel To" required error={errors.travelTo}>
                <input
                  value={row.travelTo}
                  onChange={(e) => onChange({ travelTo: e.target.value })}
                  placeholder="e.g. Mumbai"
                  className="ui-field"
                />
              </Field>
              <Field label="Travel Using" required error={errors.travelMode}>
                <select
                  value={row.travelMode}
                  onChange={(e) => onChange({ travelMode: e.target.value })}
                  className="ui-field"
                >
                  <option value="">Select mode</option>
                  {TRAVEL_MODES.map((mode) => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
              </Field>
              <Field label="Ticket Date" required error={errors.billDate}>
                <input
                  type="date"
                  value={row.billDate}
                  onChange={(e) => onChange({ billDate: e.target.value })}
                  className="ui-field"
                />
              </Field>
              <Field label="Fare (₹)" required error={errors.amount}>
                {amountField(row.amount, (amount) => onChange({ amount }))}
              </Field>
            </div>
          )}

          {row.category === "Food" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Bill No" required error={errors.billNo}>
                <input
                  value={row.billNo}
                  onChange={(e) => onChange({ billNo: e.target.value })}
                  placeholder="e.g. BILL-1024"
                  className="ui-field"
                />
              </Field>
              <Field label="Bill Date" required error={errors.billDate}>
                <input
                  type="date"
                  value={row.billDate}
                  onChange={(e) => onChange({ billDate: e.target.value })}
                  className="ui-field"
                />
              </Field>
              <Field label="Order Type" required error={errors.orderType}>
                <select
                  value={row.orderType}
                  onChange={(e) =>
                    onChange({ orderType: e.target.value, foodPlatform: "", vendorName: "" })
                  }
                  className="ui-field"
                >
                  <option value="">Select order type</option>
                  {FOOD_ORDER_TYPES.map((type) => (
                    <option key={type.key} value={type.key}>{type.label}</option>
                  ))}
                </select>
              </Field>
              {row.orderType === "online" && (
                <Field label="Ordered From" required error={errors.foodPlatform}>
                  <select
                    value={row.foodPlatform}
                    onChange={(e) =>
                      onChange({
                        foodPlatform: e.target.value,
                        vendorName: e.target.value === "Other" ? row.vendorName : "",
                      })
                    }
                    className="ui-field"
                  >
                    <option value="">Select platform</option>
                    {ONLINE_FOOD_PLATFORMS.map((platform) => (
                      <option key={platform} value={platform}>{platform}</option>
                    ))}
                  </select>
                </Field>
              )}
              {row.orderType === "online" && row.foodPlatform === "Other" && (
                <Field label="Platform Name" required error={errors.vendorName}>
                  <input
                    value={row.vendorName}
                    onChange={(e) => onChange({ vendorName: e.target.value })}
                    placeholder="e.g. EatSure"
                    className="ui-field"
                  />
                </Field>
              )}
              {row.orderType === "offline" && (
                <Field label="Restaurant Name" required error={errors.vendorName}>
                  <input
                    value={row.vendorName}
                    onChange={(e) => onChange({ vendorName: e.target.value })}
                    placeholder="e.g. Barbeque Nation"
                    className="ui-field"
                  />
                </Field>
              )}
              <Field label="Amount (₹)" required error={errors.amount}>
                {amountField(row.amount, (amount) => onChange({ amount }))}
              </Field>
            </div>
          )}

          {row.category === "Stay" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Hotel Name" required error={errors.hotelName}>
                <input
                  value={row.hotelName}
                  onChange={(e) => onChange({ hotelName: e.target.value })}
                  placeholder="e.g. Hotel Aurora"
                  className="ui-field"
                />
              </Field>
              <Field label="Bill No" required error={errors.billNo}>
                <input
                  value={row.billNo}
                  onChange={(e) => onChange({ billNo: e.target.value })}
                  placeholder="e.g. STAY-1024"
                  className="ui-field"
                />
              </Field>
              <Field label="Bill Date" required error={errors.billDate}>
                <input
                  type="date"
                  value={row.billDate}
                  onChange={(e) => onChange({ billDate: e.target.value })}
                  className="ui-field"
                />
              </Field>
              <Field label="Stay Duration (Days)" required error={errors.stayDays}>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={row.stayDays}
                  onChange={(e) => onChange({ stayDays: e.target.value })}
                  placeholder="e.g. 2"
                  className="ui-field"
                />
              </Field>
              <Field label="Amount (₹)" required error={errors.amount}>
                {amountField(row.amount, (amount) => onChange({ amount }))}
              </Field>
            </div>
          )}

          {row.category === "Fuel" && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Start Meter Reading" required error={errors.meterStart} hint={readingHint}>
                  <input
                    inputMode="numeric"
                    maxLength={METER_DIGITS}
                    value={row.meterStart}
                    onChange={(e) => onChange({ meterStart: normalizeMeterReading(e.target.value) })}
                    placeholder="e.g. 12345"
                    className="ui-field"
                  />
                </Field>
                <Field label="End Meter Reading" required error={errors.meterEnd} hint={readingHint}>
                  <input
                    inputMode="numeric"
                    maxLength={METER_DIGITS}
                    value={row.meterEnd}
                    onChange={(e) => onChange({ meterEnd: normalizeMeterReading(e.target.value) })}
                    placeholder="e.g. 12485"
                    className="ui-field"
                  />
                </Field>
                <Field label="Fuel Rate (₹ per litre)" required error={errors.fuelRate}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.fuelRate}
                    onChange={(e) => onChange({ fuelRate: e.target.value })}
                    placeholder="e.g. 104.50"
                    className="ui-field"
                  />
                </Field>
                <div className="rounded-xl border border-line bg-surface px-4 py-3 text-xs text-ink-muted">
                  <div className="flex items-center justify-between gap-3">
                    <span>Distance</span>
                    <span className="font-semibold text-ink">{metrics.distanceKm.toLocaleString("en-IN")} km</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span>Fuel used ({FUEL_KM_PER_LITRE} km/l)</span>
                    <span className="font-semibold text-ink">{metrics.fuelLitres} L</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-2">
                    <span className="font-semibold text-ink">Claim amount</span>
                    <span className="text-sm font-bold text-ink">{formatAmount(metrics.cost)}</span>
                  </div>
                </div>
              </div>
              <Field label="Reason" required error={errors.note}>
                <input
                  value={row.note}
                  onChange={(e) => onChange({ note: e.target.value })}
                  placeholder="Why was this fuel used?"
                  className="ui-field"
                />
              </Field>
            </>
          )}

          {(row.category === "Medical" || row.category === "Other") && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Bill No" required error={errors.billNo}>
                <input
                  value={row.billNo}
                  onChange={(e) => onChange({ billNo: e.target.value })}
                  placeholder="e.g. BILL-1024"
                  className="ui-field"
                />
              </Field>
              <Field label="Bill Date" required error={errors.billDate}>
                <input
                  type="date"
                  value={row.billDate}
                  onChange={(e) => onChange({ billDate: e.target.value })}
                  className="ui-field"
                />
              </Field>
              <Field label="Amount (₹)" required error={errors.amount}>
                {amountField(row.amount, (amount) => onChange({ amount }))}
              </Field>
            </div>
          )}

          {row.category && row.category !== "Fuel" && (
            <Field label="Remark">
              <input
                value={row.note}
                onChange={(e) => onChange({ note: e.target.value })}
                placeholder="Any remark for finance"
                className="ui-field"
              />
            </Field>
          )}
        </div>

        {row.category && (
          <div className="border-t border-line pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-subtle">Attachments</p>
            <div className="space-y-4">
              {IMAGE_CATEGORIES.includes(row.category) && (
                <ImagesPanel
                  label={row.category === "Travel" ? "Ticket images" : "Bill images"}
                  images={billImages}
                  uploading={uploadCount("receiptUrls")}
                  error={errors.receiptUrls}
                  hint={`Up to ${MAX_BILL_IMAGES} clear images. Click a thumbnail to open it full size.`}
                  onAdd={(files) => onAddImages("receiptUrls", files)}
                  onRemove={(imageIndex) => onRemoveImage(imageIndex)}
                />
              )}
              {row.category === "Fuel" && (
                <>
                  <SingleImagePanel
                    label="Start meter"
                    value={row.meterStartImg}
                    uploading={uploadCount("meterStartImg")}
                    error={errors.meterStartImg}
                    hint="Clear photo before the trip."
                    onUpload={(file) => onUploadSingle("meterStartImg", file)}
                    onRemove={() => onRemoveSingle("meterStartImg")}
                  />
                  <SingleImagePanel
                    label="End meter"
                    value={row.meterEndImg}
                    uploading={uploadCount("meterEndImg")}
                    error={errors.meterEndImg}
                    hint="Clear photo after the trip."
                    onUpload={(file) => onUploadSingle("meterEndImg", file)}
                    onRemove={() => onRemoveSingle("meterEndImg")}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ClaimModal({ open, onClose, onSubmit, submitting = false }) {
  const [claimType, setClaimType] = useState("single");
  const [title, setTitle] = useState("");
  const [tripFrom, setTripFrom] = useState("");
  const [tripTo, setTripTo] = useState("");
  const [expenses, setExpenses] = useState([createEmptyExpense()]);
  const [rowErrors, setRowErrors] = useState([{}]);
  const [formError, setFormError] = useState("");
  const [uploading, setUploading] = useState({ index: null, field: "", count: 0 });

  if (!open) return null;

  const isUploading = uploading.index !== null;

  const patchRow = (index, patch) => {
    setExpenses((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const updateRow = (index, updater) => {
    setExpenses((prev) => prev.map((row, i) => (i === index ? updater(row) : row)));
  };

  const replaceRow = (index, nextRow) => {
    setExpenses((prev) => prev.map((row, i) => (i === index ? nextRow : row)));
    setRowErrors((prev) => prev.map((errors, i) => (i === index ? {} : errors)));
  };

  const clearRowError = (index, field) => {
    setRowErrors((prev) =>
      prev.map((errors, i) => (i === index ? { ...errors, [field]: undefined } : errors))
    );
  };

  const handleAddImages = async (index, field, files) => {
    const existing = expenses[index]?.receiptUrls || [];
    const remaining = MAX_BILL_IMAGES - existing.length;
    if (remaining <= 0) {
      toast.error(`You can attach up to ${MAX_BILL_IMAGES} images per bill.`);
      return;
    }

    const accepted = [];
    for (const file of files) {
      if (accepted.length >= remaining) {
        toast.info(`Only ${remaining} more image${remaining === 1 ? "" : "s"} can be added to this bill.`);
        break;
      }
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image.`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 5 MB.`);
        continue;
      }
      accepted.push(file);
    }
    if (!accepted.length) return;

    let pending = accepted.length;
    setUploading({ index, field, count: pending });
    try {
      for (const file of accepted) {
        const result = await uploadReceiptApi(file);
        pending -= 1;
        setUploading({ index, field, count: pending });
        if (!result?.success || !result.data?.url) {
          toast.error(result?.message || `Could not upload ${file.name}.`);
          continue;
        }
        updateRow(index, (row) => ({
          ...row,
          receiptUrls: [...(row.receiptUrls || []), result.data.url],
        }));
      }
    } catch (error) {
      toast.error(error.message || "Image upload failed.");
    } finally {
      setUploading({ index: null, field: "", count: 0 });
      clearRowError(index, field);
    }
  };

  const handleSingleUpload = async (index, field, file) => {
    if (!file.type.startsWith("image/")) {
      toast.error(`${file.name} is not an image.`);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5 MB.");
      return;
    }
    setUploading({ index, field, count: 1 });
    try {
      const result = await uploadReceiptApi(file);
      if (!result?.success || !result.data?.url) {
        toast.error(result?.message || "Image upload failed.");
        return;
      }
      updateRow(index, (row) => ({ ...row, [field]: result.data.url }));
      clearRowError(index, field);
    } catch (error) {
      toast.error(error.message || "Image upload failed.");
    } finally {
      setUploading({ index: null, field: "", count: 0 });
    }
  };

  const removeImage = (index, imageIndex) => {
    updateRow(index, (row) => ({
      ...row,
      receiptUrls: (row.receiptUrls || []).filter((_, i) => i !== imageIndex),
    }));
  };

  const removeSingleImage = (index, field) => {
    updateRow(index, (row) => ({ ...row, [field]: "" }));
  };

  const handleSubmit = () => {
    const errors = expenses.map(validateExpenseRow);
    setRowErrors(errors);
    if (errors.some(hasErrors)) {
      setFormError("Fix the highlighted expense fields before submitting.");
      return;
    }
    if (claimType === "trip") {
      if (!title.trim()) {
        setFormError("Give the trip a title (e.g. Mumbai client visit).");
        return;
      }
      if (tripFrom && tripTo && tripTo < tripFrom) {
        setFormError("Trip end date cannot be before the start date.");
        return;
      }
    }
    setFormError("");

    const payloadExpenses = expenses.map((row) => {
      const receiptUrls = (row.receiptUrls || []).filter(Boolean);
      const base = { ...row, receiptUrls, receiptUrl: receiptUrls[0] || "" };
      if (row.category === "Fuel") {
        const metrics = fuelMetrics(row);
        return {
          ...base,
          amount: metrics.cost,
          distanceKm: metrics.distanceKm,
          fuelLitres: metrics.fuelLitres,
          kmPerLitre: FUEL_KM_PER_LITRE,
        };
      }
      return { ...base, amount: Number(row.amount) };
    });

    const payload =
      claimType === "single"
        ? {
            type: "single",
            category: payloadExpenses[0].category,
            title: `${payloadExpenses[0].category} expense`,
            expenses: payloadExpenses.slice(0, 1),
          }
        : {
            type: "trip",
            title: title.trim(),
            tripFrom,
            tripTo,
            expenses: payloadExpenses,
          };
    onSubmit(payload, resetForm);
  };

  const resetForm = () => {
    setClaimType("single");
    setTitle("");
    setTripFrom("");
    setTripTo("");
    setExpenses([createEmptyExpense()]);
    setRowErrors([{}]);
    setFormError("");
    setUploading({ index: null, field: "", count: 0 });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-surface shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <h2 className="ui-card-title">New Reimbursement Claim</h2>
            <p className="text-sm text-ink-subtle">Submits as pending for Finance Manager approval</p>
          </div>
          <button type="button" onClick={handleClose} aria-label="Close" className="ui-icon-btn">
            <FiX size={20} />
          </button>
        </div>

        <div className="max-h-[calc(90vh-170px)] space-y-4 overflow-y-auto p-6">
          <div>
            <label className="ui-eyebrow mb-1.5 block">Claim Type *</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "single", label: "Single", hint: "One bill, one category" },
                { key: "trip", label: "Trip", hint: "Multiple bills, one trip" },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    setClaimType(option.key);
                    setExpenses(option.key === "single" ? [expenses[0] || createEmptyExpense()] : expenses);
                    setRowErrors([{}]);
                  }}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    claimType === option.key
                      ? "border-brand bg-brand/5 ring-2 ring-brand-ring"
                      : "border-line bg-surface-muted hover:border-brand/40"
                  }`}
                >
                  <p className="text-sm font-bold text-ink">{option.label}</p>
                  <p className="mt-0.5 text-xs text-ink-subtle">{option.hint}</p>
                </button>
              ))}
            </div>
          </div>

          {claimType === "trip" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label className="ui-eyebrow mb-1.5 block">Trip Title *</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mumbai client visit" className="ui-field" />
              </div>
              <div>
                <label className="ui-eyebrow mb-1.5 block">Trip From</label>
                <input type="date" value={tripFrom} onChange={(e) => setTripFrom(e.target.value)} className="ui-field" />
              </div>
              <div>
                <label className="ui-eyebrow mb-1.5 block">Trip To</label>
                <input type="date" value={tripTo} onChange={(e) => setTripTo(e.target.value)} className="ui-field" />
              </div>
            </div>
          )}

          {expenses.map((row, index) => (
            <ExpenseRow
              key={index}
              index={index}
              row={row}
              errors={rowErrors[index] || {}}
              uploading={uploading}
              onChange={(patch) => patchRow(index, patch)}
              onReplace={(nextRow) => replaceRow(index, nextRow)}
              onAddImages={(field, files) => handleAddImages(index, field, files)}
              onUploadSingle={(field, file) => handleSingleUpload(index, field, file)}
              onRemoveImage={(imageIndex) => removeImage(index, imageIndex)}
              onRemoveSingle={(field) => removeSingleImage(index, field)}
              onRemove={() => {
                setExpenses((prev) => prev.filter((_, i) => i !== index));
                setRowErrors((prev) => prev.filter((_, i) => i !== index));
              }}
              removable={claimType === "trip" && expenses.length > 1}
            />
          ))}

          {claimType === "trip" && expenses.length < MAX_TRIP_EXPENSES && (
            <button
              type="button"
              onClick={() => {
                setExpenses((prev) => [...prev, createEmptyExpense()]);
                setRowErrors((prev) => [...prev, {}]);
              }}
              className="ui-btn ui-btn-secondary w-full text-xs font-semibold"
            >
              <FiPlus size={14} /> Add another expense
            </button>
          )}

          {formError && <p className="text-xs font-medium text-red-500">{formError}</p>}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={handleClose} disabled={submitting} className="ui-btn ui-btn-secondary font-semibold">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={submitting || isUploading} className="ui-btn ui-btn-primary font-semibold">
            {(submitting || isUploading) && <FiLoader className="animate-spin" />}
            {submitting ? "Submitting..." : isUploading ? "Uploading image..." : "Submit Claim"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClaimModal;
