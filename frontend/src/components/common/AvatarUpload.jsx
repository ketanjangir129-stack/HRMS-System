import { useRef, useState } from "react";
import { Pencil, Loader2 } from "lucide-react";
import { uploadFileApi } from "../../services/api/uploadApi";

/*
|--------------------------------------------------------------------------
| Avatar Upload
|--------------------------------------------------------------------------
| Default me initials ka block dikhta hai — photo tabhi aati hai jab user
| pencil (edit) button se ek image upload karta hai. Image Cloudinary par
| jaati hai (backend ke through), URL parent ko onUploaded se milta hai jo
| usko employee record me save kar deta hai.
|--------------------------------------------------------------------------
*/
function AvatarUpload({ photoUrl, name, employeeId, onUploaded, className = "" }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const initials =
    (name || "?")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "?";

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const result = await uploadFileApi(file, {
        folder: `employees/${String(employeeId || "unknown").toUpperCase()}/photo`,
        resourceType: "image",
      });

      await onUploaded?.(result.url);
    } catch (err) {
      console.error("Avatar upload failed:", err);
      setError(err.message || "Failed to upload photo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`relative inline-flex ${className}`}>
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={name || "Profile photo"}
          className="h-full w-full rounded-2xl object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-bold">
          {initials}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Edit profile photo"
        className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-800 text-white shadow transition hover:bg-slate-900 disabled:opacity-60"
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {error && (
        <p className="absolute left-0 top-full mt-1 w-max max-w-[180px] text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

export default AvatarUpload;
