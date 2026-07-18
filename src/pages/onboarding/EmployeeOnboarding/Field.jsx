function Field({
  label,
  name,
  value,
  onChange,
  error,
  type = "text",
  as = "input",
  options = [],
  placeholder = "",
  readOnly = false,
  required = false,
  rows = 4,
  fullWidth = false,
}) {
  const baseClass =
    "border p-3 rounded-lg w-full outline-none focus:ring-2 focus:ring-blue-500";

  const stateClass = readOnly
    ? "bg-gray-100 text-gray-600 cursor-not-allowed"
    : error
    ? "border-red-500 focus:ring-red-400"
    : "border-gray-300";

  const className = `${baseClass} ${stateClass}`;

  return (
    <div className={fullWidth ? "col-span-2" : ""}>
      {label && (
        <label className="block mb-1 text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}

      {as === "select" ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          disabled={readOnly}
          className={className}
        >
          <option value="">{placeholder || "Select"}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : as === "textarea" ? (
        <textarea
          name={name}
          rows={rows}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          placeholder={placeholder}
          className={className}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          placeholder={placeholder}
          className={className}
        />
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default Field;
