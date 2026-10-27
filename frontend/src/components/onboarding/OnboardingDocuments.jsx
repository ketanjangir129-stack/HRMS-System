import { useEffect, useState } from "react";
import {
    FiCheckCircle,
    FiCreditCard,
    FiExternalLink,
    FiEye,
    FiFileText,
    FiShield,
    FiUser,
    FiX,
} from "react-icons/fi";

/*
|--------------------------------------------------------------------------
| Onboarding Documents
|--------------------------------------------------------------------------
| The files the candidate attached to the onboarding form. They are stored
| on the request as Cloudinary URLs — `aadhaarCardUrl`, `panCardUrl`,
| `resumeUrl` and `passportPhotoUrl` — which `approveOnboarding` later
| carries over to the employee record.
|
| The uploads are optional on the form, so every row is rendered whether or
| not a file came back: the approver should be able to see that a document
| was not provided, rather than wonder whether it is hidden somewhere else.
|--------------------------------------------------------------------------
*/

const DOCUMENTS = [
    {
        key: "aadhaarCardUrl",
        legacyKey: "aadhaarCard",
        label: "Aadhaar Card",
        hint: "Identity proof",
        icon: FiShield,
    },
    {
        key: "panCardUrl",
        legacyKey: "panCard",
        label: "PAN Card",
        hint: "Tax identity",
        icon: FiCreditCard,
    },
    {
        key: "resumeUrl",
        legacyKey: "resume",
        label: "Resume",
        hint: "Curriculum vitae",
        icon: FiFileText,
    },
    {
        key: "passportPhotoUrl",
        legacyKey: "passportPhoto",
        label: "Passport Photo",
        hint: "Photograph",
        icon: FiUser,
    },
];

const documentUrl = (documents, document) =>
    String(
        documents?.[document.key] || documents?.[document.legacyKey] || ""
    ).trim();

// Cloudinary keeps the original extension in the delivery URL, so the kind
// can be read off the path without asking the server.
const fileKind = (url) => {
    const path = String(url || "").split("?")[0].toLowerCase();

    if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(path)) return "image";
    if (/\.pdf$/.test(path)) return "pdf";

    return "file";
};

const statusPill =
    "inline-flex shrink-0 items-center whitespace-nowrap rounded-full text-[11px] font-semibold";

function DocumentPreview({ document, onClose }) {
    const [failed, setFailed] = useState(false);

    // Escape closes the viewer, and the page behind it does not scroll while
    // it is open. Both are undone on close so the next preview starts clean.
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handleKeyDown);

        const previousOverflow = window.document.body.style.overflow;
        window.document.body.style.overflow = "hidden";

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.document.body.style.overflow = previousOverflow;
        };
    }, [onClose]);

    const Icon = document.icon;
    const kind = fileKind(document.url);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={`${document.label} preview`}
            onClick={onClose}
        >
            <div
                className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >

                {/* Header */}
                <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">

                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Icon size={20} />
                    </span>

                    <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold text-slate-900 sm:text-lg">
                            {document.label}
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                            {document.hint} · uploaded by the candidate
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close preview"
                        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                    >
                        <FiX size={18} />
                    </button>

                </div>

                {/* Body */}
                <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3 sm:p-5">

                    {failed ? (
                        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
                            <FiFileText size={30} className="text-slate-400" />
                            <p className="text-sm text-slate-600">
                                This file could not be previewed here.
                            </p>
                            <a
                                href={document.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                            >
                                <FiExternalLink size={15} />
                                Open document
                            </a>
                        </div>
                    ) : kind === "image" ? (
                        <div className="flex min-h-64 items-center justify-center rounded-xl bg-white p-2">
                            <img
                                src={document.url}
                                alt={document.label}
                                onError={() => setFailed(true)}
                                className="max-h-[72vh] max-w-full object-contain"
                            />
                        </div>
                    ) : kind === "pdf" ? (
                        <div className="rounded-xl bg-white p-2">
                            <iframe
                                src={document.url}
                                title={document.label}
                                className="h-[68vh] w-full rounded-lg border border-slate-200"
                            />
                            <p className="px-2 pb-1 pt-2 text-center text-xs text-slate-500">
                                If the preview does not load, use “Open in new
                                tab” below.
                            </p>
                        </div>
                    ) : (
                        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
                            <FiFileText size={30} className="text-slate-400" />
                            <p className="text-sm text-slate-600">
                                This file type cannot be shown inline.
                            </p>
                            <a
                                href={document.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                            >
                                <FiExternalLink size={15} />
                                Open document
                            </a>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 sm:px-6">

                    <p className="text-xs text-slate-500">
                        Check that the name and number on the document match the
                        details on this request.
                    </p>

                    <div className="flex items-center gap-2">

                        <a
                            href={document.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                        >
                            <FiExternalLink size={13} />
                            Open in new tab
                        </a>

                        <button
                            type="button"
                            onClick={onClose}
                            className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
                        >
                            Close
                        </button>

                    </div>

                </div>

            </div>
        </div>
    );
}

function OnboardingDocuments({ documents, submitted = false }) {
    const [preview, setPreview] = useState(null);

    const items = DOCUMENTS.map((document) => ({
        ...document,
        url: documentUrl(documents, document),
    }));

    const uploadedCount = items.filter((item) => item.url).length;

    // Complete set reads green, a partial set amber, none at all neutral —
    // the count alone is easy to skim past.
    const summaryTone =
        uploadedCount === 0
            ? "bg-slate-100 text-slate-600"
            : uploadedCount === items.length
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700";

    // const openPreview = (item) => {
    //     setPreview({
    //         label: item.label,
    //         hint: item.hint,
    //         icon: item.icon,
    //         url: item.url,
    //     });
    // };

    return (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">

            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">

                <div>
                    <h2 className="text-xl font-semibold">
                        Documents
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Files attached to the onboarding form. Verify them
                        against the details above before approving.
                    </p>
                </div>

                <span
                    className={`${statusPill} px-3 py-1 ${summaryTone}`}
                >
                    {uploadedCount} of {items.length} uploaded
                </span>

            </div>

            {uploadedCount === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">

                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
                        <FiFileText size={22} />
                    </span>

                    <h3 className="mt-4 text-sm font-semibold text-slate-800">
                        {submitted ? "No documents attached" : "No documents yet"}
                    </h3>

                    <p className="mt-1 max-w-md text-sm text-slate-500">
                        {submitted
                            ? "The candidate has not uploaded any documents with this form. Document uploads are optional, so this is not necessarily a reason to hold the request."
                            : "The candidate has not submitted the onboarding form yet, so there is nothing to verify here. The uploaded files will appear once the form comes back."}
                    </p>

                </div>
            ) : (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {items.map((item) => {
                        const Icon = item.icon;
                        const uploaded = Boolean(item.url);

                        return (
                            <li
                                key={item.key}
                                className={
                                    "flex items-center gap-3 rounded-xl border p-3 sm:p-4 " +
                                    (uploaded
                                        ? "border-slate-200 bg-white"
                                        : "border-dashed border-slate-200 bg-slate-50/70")
                                }
                            >

                                <span
                                    className={
                                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl " +
                                        (uploaded
                                            ? "bg-blue-50 text-blue-600"
                                            : "bg-slate-100 text-slate-400")
                                    }
                                >
                                    <Icon size={19} />
                                </span>

                                {/* `min-w-0` keeps a long label from pushing the
                                    actions off the row. */}
                                <div className="min-w-0 flex-1">

                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">

                                        <p className="truncate text-sm font-semibold text-slate-800">
                                            {item.label}
                                        </p>

                                        <span
                                            className={
                                                `${statusPill} px-2.5 py-0.5 ` +
                                                (uploaded
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : "bg-slate-100 text-slate-500")
                                            }
                                        >
                                            {uploaded ? (
                                                <>
                                                    <FiCheckCircle
                                                        size={11}
                                                        className="mr-1"
                                                    />
                                                    Uploaded
                                                </>
                                            ) : (
                                                "Not uploaded"
                                            )}
                                        </span>

                                    </div>

                                    <p className="mt-0.5 truncate text-xs text-slate-500">
                                        {item.hint}
                                    </p>

                                </div>

                                {uploaded && (
                                    <div className="flex shrink-0 items-center gap-1.5">

                                        {/* <button
                                            type="button"
                                            onClick={() => openPreview(item)}
                                            title={`View ${item.label}`}
                                            aria-label={`View ${item.label}`}
                                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                                        >
                                            <FiEye size={14} />
                                            <span className="hidden sm:inline">
                                                View
                                            </span>
                                        </button> */}

                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            title={`Open ${item.label} in a new tab`}
                                            aria-label={`Open ${item.label} in a new tab`}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-blue-500 hover:text-blue-600"
                                        >
                                            <FiExternalLink size={14} />
                                        </a>

                                    </div>
                                )}

                            </li>
                        );
                    })}
                </ul>
            )}

            {preview && (
                <DocumentPreview
                    document={preview}
                    onClose={() => setPreview(null)}
                />
            )}

        </div>
    );
}

export default OnboardingDocuments;
