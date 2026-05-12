import { useCallback, useState } from "react";

const THUMBNAIL_MAX_DIMENSION = 512;
const THUMBNAIL_QUALITY = 0.82;

export type UploadingFile = {
  localId: string;
  name: string;
  status: "uploading" | "done" | "error";
  errorMessage?: string;
};

async function generateImageThumbnail(file: File) {
  if (!file.type.startsWith("image/")) return null;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (error) {
    console.warn("Failed to decode image for thumbnail:", error);
    return null;
  }

  try {
    const scale = Math.min(
      THUMBNAIL_MAX_DIMENSION / bitmap.width,
      THUMBNAIL_MAX_DIMENSION / bitmap.height,
      1,
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.drawImage(bitmap, 0, 0, width, height);

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", THUMBNAIL_QUALITY);
    });
  } finally {
    bitmap.close();
  }
}

async function uploadThumbnail(fileId: string, thumbnail: Blob) {
  const response = await fetch(`/api/files/${fileId}/thumbnail`, {
    method: "POST",
    headers: {
      "content-type": "image/webp",
    },
    body: thumbnail,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      (body as { error?: string } | null)?.error ??
      `Thumbnail upload failed (${response.status})`;
    throw new Error(message);
  }
}

export function useUpload(
  currentFolderId: string | null,
  onComplete: () => void,
) {
  const [uploading, setUploading] = useState<UploadingFile[]>([]);

  const uploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      console.log("uploadFiles");
      const files = Array.from(fileList);
      if (files.length === 0) return;

      const newEntries: UploadingFile[] = files.map((f) => ({
        localId: crypto.randomUUID(),
        name: f.name,
        status: "uploading" as const,
      }));

      setUploading((prev) => [...prev, ...newEntries]);

      const results = await Promise.allSettled(
        files.map(async (file, i) => {
          const params = new URLSearchParams({
            filename: file.name,
            contentType: file.type || "application/octet-stream",
          });
          if (currentFolderId) {
            params.set("folderId", currentFolderId);
          }

          const response = await fetch(`/api/files/upload?${params}`, {
            method: "POST",
            body: file,
          });

          if (!response.ok) {
            const body = await response.json().catch(() => null);
            const message =
              (body as { error?: string } | null)?.error ??
              `Upload failed (${response.status})`;
            throw new Error(message);
          }

          const body = (await response.json()) as { id: string };
          const thumbnail = await generateImageThumbnail(file);
          if (thumbnail) {
            try {
              await uploadThumbnail(body.id, thumbnail);
            } catch (error) {
              console.warn("Failed to upload thumbnail:", error);
            }
          }

          return { localId: newEntries[i].localId };
        }),
      );

      setUploading((prev) =>
        prev.map((entry) => {
          const resultIndex = newEntries.findIndex(
            (e) => e.localId === entry.localId,
          );
          if (resultIndex === -1) return entry;

          const result = results[resultIndex];
          if (result.status === "fulfilled") {
            return { ...entry, status: "done" as const };
          }
          return {
            ...entry,
            status: "error" as const,
            errorMessage: result.reason?.message ?? "Upload failed",
          };
        }),
      );

      // clear completed uploads after a brief delay
      const CLEAR_DELAY_MS = 1500;
      setTimeout(() => {
        setUploading((prev) => prev.filter((e) => e.status !== "done"));
      }, CLEAR_DELAY_MS);

      onComplete();
    },
    [currentFolderId, onComplete],
  );

  const dismissError = useCallback((localId: string) => {
    setUploading((prev) => prev.filter((e) => e.localId !== localId));
  }, []);

  return { uploading, uploadFiles, dismissError };
}
