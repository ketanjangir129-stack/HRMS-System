const STEPS = [
  { id: 1, label: "Basic Info" },
  { id: 2, label: "Personal" },
  { id: 3, label: "Bank Details" },
  { id: 4, label: "KYC / Documents" },
];

function Stepper({ step, onStepClick }) {
  return (
    <div className="flex items-center mb-10">
      {STEPS.map((s, index) => {
        const isCompleted = s.id < step;
        const isActive = s.id === step;
        // Only previous (completed) steps are clickable — no jumping forward.
        const clickable = isCompleted;

        return (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick(s.id)}
              className="flex flex-col items-center gap-2 focus:outline-none"
            >
              <span
                className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold border-2 transition-colors ${
                  isActive
                    ? "bg-blue-600 border-blue-600 text-white"
                    : isCompleted
                    ? "bg-blue-100 border-blue-600 text-blue-600"
                    : "bg-white border-gray-300 text-gray-400"
                } ${clickable ? "cursor-pointer" : "cursor-default"}`}
              >
                {isCompleted ? "✓" : s.id}
              </span>
              <span
                className={`text-xs font-medium ${
                  isActive || isCompleted ? "text-blue-600" : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
            </button>

            {index < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 ${
                  s.id < step ? "bg-blue-600" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default Stepper;
