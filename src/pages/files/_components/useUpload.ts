import { useCallback, useState } from "react";

export type UploadingFile = {
  localId: string;
  name: string;
  status: "uploading" | "done" | "error";
  errorMessage?: string;
};

export function useUpload(
  currentFolderId: string | null,
  onComplete: () => void,
) {
  const [uploading, setUploading] = useState<UploadingFile[]>([]);

  const uploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
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
