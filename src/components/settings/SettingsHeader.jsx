import { FiSettings } from "react-icons/fi";

function SettingsHeader({ companyName }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:px-6 sm:py-5 md:flex-row md:items-center md:justify-between">

      {/*
      | `min-w-0` on both the row and the text column is what keeps a long
      | company name inside the card: without it a flex item refuses to shrink
      | below its content and the name pushes the panel wider than the page.
      */}
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-600/20 sm:h-11 sm:w-11">
          <FiSettings className="text-lg text-white sm:text-xl" />
        </div>

        <div className="min-w-0">

          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">
            Settings
          </h1>

          <p className="mt-0.5 text-xs wrap-break-word text-slate-500 sm:mt-1 sm:text-sm lg:text-base">
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
