import { authClient } from "#/lib/auth-client";
import { Camera, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

const MAX_DIMENSION = 512;
const JPEG_QUALITY = 0.85;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type Props = {
  currentImage: string | null;
  name: string | null;
  email: string;
};

export function ChangeImageSection({ currentImage, name, email }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState<"idle" | "saving" | "removing">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activePreviewUrl = useRef<string | null>(null);

  const isLoading = loading !== "idle";
  const displayImage = previewUrl ?? currentImage;
  const initials = getInitials(name, email);

  function clearPreview() {
    if (activePreviewUrl.current) {
      URL.revokeObjectURL(activePreviewUrl.current);
      activePreviewUrl.current = null;
    }
    setPreviewUrl(null);
    setPreviewBlob(null);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset so selecting the same file again re-triggers onChange
    e.target.value = "";
    if (!file) return;

    setError(null);
    setSuccessMsg(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, and WebP images are allowed.");
      return;
    }

    try {
      const resized = await resizeImage(file, MAX_DIMENSION);
      clearPreview();
      const url = URL.createObjectURL(resized);
      activePreviewUrl.current = url;
      setPreviewUrl(url);
      setPreviewBlob(resized);
    } catch {
      setError("Failed to process image. Please try a different file.");
    }
  }

  async function handleSave() {
    if (!previewBlob) return;

    setError(null);
    setSuccessMsg(null);
    setLoading("saving");

    try {
      const formData = new FormData();
      formData.append("image", previewBlob, "avatar.jpg");

      const res = await fetch("/api/upload-avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json<{ imageUrl?: string; error?: string }>();

      if (!res.ok) {
        setError(data.error ?? "Upload failed. Please try again.");
        setLoading("idle");
        return;
      }

      const { error: authError } = await authClient.updateUser({
        image: data.imageUrl,
      });

      if (authError) {
        setError(
          authError.message ?? "Failed to save photo. Please try again.",
        );
        setLoading("idle");
        return;
      }

      clearPreview();
      setSuccessMsg("Profile photo updated.");
    } catch {
      setError("Upload failed. Please try again.");
    }

    setLoading("idle");
  }

  async function handleRemove() {
    setError(null);
    setSuccessMsg(null);
    setLoading("removing");

    const { error: authError } = await authClient.updateUser({ image: null });

    setLoading("idle");

    if (authError) {
      setError(
        authError.message ?? "Failed to remove photo. Please try again.",
      );
      return;
    }

    setSuccessMsg("Profile photo removed.");
  }

  function handleCancel() {
    clearPreview();
    setError(null);
  }

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body gap-4">
        <h2 className="card-title text-lg">Profile photo</h2>

        {error && (
          <div role="alert" className="alert alert-error text-sm">
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div role="alert" className="alert alert-success text-sm">
            <span>{successMsg}</span>
          </div>
        )}

        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="shrink-0">
            {displayImage ? (
              <div className="avatar">
                <div
                  className="ring-base-300 w-20 rounded-full ring-2
                    ring-offset-2"
                >
                  <img src={displayImage} alt="Your avatar" />
                </div>
              </div>
            ) : (
              <div className="avatar avatar-placeholder">
                <div
                  className="bg-primary text-primary-content w-20 rounded-full"
                >
                  <span className="text-2xl font-semibold">{initials}</span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {previewUrl ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleSave}
                  disabled={isLoading}
                >
                  {loading === "saving" && (
                    <span className="loading loading-spinner loading-xs" />
                  )}
                  Save photo
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-neutral btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                >
                  <Camera size={16} />
                  Change photo
                </button>
                {currentImage && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm text-error"
                    onClick={handleRemove}
                    disabled={isLoading}
                  >
                    {loading === "removing" ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    Remove
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return email[0].toUpperCase();
}

async function resizeImage(file: File, maxDimension: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(1, maxDimension / Math.max(w, h));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob failed"));
        },
        "image/jpeg",
        JPEG_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };

    img.src = objectUrl;
  });
}
