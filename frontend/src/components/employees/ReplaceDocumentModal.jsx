import { useEffect } from "react";
import { ArrowDown, FileText, RefreshCw, X } from "lucide-react";

// "1234567" → "1.2 MB"
const formatSize = (bytes) => {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Cloudinary URL ka aakhri hissa hi file ka naam hai
const fileNameFromUrl = (url) => {
    try {
        return decodeURIComponent(String(url).split("?")[0].split("/").pop() || "");
    } catch {
        return String(url);
    }
};

/*
| Document row ke edit-icon se nayi file chuni aur purani pehle se hai —
| window.confirm ki jagah ye dikhta hai. Confirm par file sirf stage hoti
| hai; asli update "Save Changes" par hi hota hai.
*/
function ReplaceDocumentModal({ open, documentLabel, previousUrl, file, onConfirm, onClose }) {

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event) => {
            if (event.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, onClose]);

    if (!open || !file) return null;

    return (
        <div
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="replace-document-title"
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
            >

                <div className="mb-5 flex items-start justify-between gap-4">

                    <div className="flex items-center gap-3">

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                            <RefreshCw className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                            <h2
                                id="replace-document-title"
                                className="text-lg font-bold tracking-tight text-slate-900"
                            >
                                Replace {documentLabel}?
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500">
                                The file already on record will be swapped for the new one.
                            </p>
                        </div>

                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        title="Close"
                        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X className="h-4 w-4" />
                    </button>

                </div>

                {/* Current → New */}
                <div className="space-y-2">

                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400">
                            <FileText className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                Current
                            </p>
                            <p className="truncate text-sm font-medium text-slate-500 line-through decoration-slate-300">
                                {fileNameFromUrl(previousUrl)}
                            </p>
                        </div>
                        <a
                            href={previousUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50"
                        >
                            View
                        </a>
                    </div>

                    <div className="flex justify-center text-slate-300">
                        <ArrowDown className="h-4 w-4" />
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600">
                            <FileText className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-blue-500">
                                New
                            </p>
                            <p className="truncate text-sm font-semibold text-slate-900">
                                {file.name}
                            </p>
                        </div>
                        <span className="shrink-0 text-xs text-slate-500">
                            {formatSize(file.size)}
                        </span>
                    </div>

                </div>

                <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                    Nothing changes yet. The new file is uploaded only when you click
                    "Save Changes".
                </p>

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300 sm:w-auto"
                    >
                        Keep Current
                    </button>

                    <button
                        type="button"
                        autoFocus
                        onClick={onConfirm}
                        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 sm:w-auto"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Use New File
                    </button>

                </div>

            </div>
        </div>
    );
}

export default ReplaceDocumentModal;
