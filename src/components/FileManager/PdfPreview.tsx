import { Download } from "lucide-react";
import { memo } from "react";

export const PdfPreview = memo(
  ({ src, title }: { src: string; title: string }) => {
    return (
      <object
        data={src}
        type="application/pdf"
        className="bg-base-200 min-h-0 flex-1 rounded"
        aria-label={title}
      >
        <div
          className="flex h-full flex-col items-center justify-center gap-4 p-8"
        >
          <p className="text-base-content/70 text-center">
            This browser cannot display the PDF preview.
          </p>
          <a
            href={src}
            download={title}
            className="btn btn-primary btn-sm gap-2"
          >
            <Download size={14} />
            Download PDF
          </a>
        </div>
      </object>
    );
  },
);

PdfPreview.displayName = "PdfPreview";
