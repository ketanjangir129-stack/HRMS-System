import { FiSettings } from "react-icons/fi";

function SettingsHeader({ companyName }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6 md:flex-row md:items-center md:justify-between">

      <div className="flex items-center gap-3 sm:gap-4">

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-600/20">
          <FiSettings className="text-xl text-white" />
        </div>

        <div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Settings
          </h1>

          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            {companyName
              ? `Company configuration · ${companyName}`
              : "Company configuration"}
          </p>

        </div>

      </div>

    </div>
  );
}

export default SettingsHeader;
