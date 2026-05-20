import {
  File,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  type LucideIcon,
} from "lucide-react";

export function fileTypeIcon(contentType: string): LucideIcon {
  if (contentType.startsWith("image/")) return FileImage;
  if (contentType.startsWith("video/")) return FileVideo;
  if (contentType.startsWith("audio/")) return FileAudio;
  if (contentType.startsWith("text/")) return FileText;
  if (contentType === "application/pdf") return FileText;
  return File;
}
