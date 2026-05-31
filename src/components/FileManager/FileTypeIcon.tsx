import {
  File,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  type LucideProps,
} from "lucide-react";
import { memo, type SVGProps } from "react";

export const FileTypeIcon = memo(
  ({
    contentType,
    ...rest
  }: { contentType: string } & SVGProps<SVGSVGElement> & LucideProps) => {
    if (contentType.startsWith("image/")) return <FileImage {...rest} />;
    if (contentType.startsWith("video/")) return <FileVideo {...rest} />;
    if (contentType.startsWith("audio/")) return <FileAudio {...rest} />;
    if (contentType.startsWith("text/")) return <FileText {...rest} />;
    if (contentType === "application/pdf") return <FileText {...rest} />;
    return <File {...rest} />;
  },
);
