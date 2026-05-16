import type { BreadcrumbSegment } from "./types";
import { Home } from "lucide-react";
import { memo } from "react";

export const Breadcrumbs = memo(
  ({
    segments,
    onNavigate,
  }: {
    segments: BreadcrumbSegment[];
    onNavigate: (folderId: string | null) => void;
  }) => {
    return (
      <nav className="breadcrumbs text-sm">
        <ul>
          <li>
            <button
              className="btn btn-ghost btn-sm gap-1 px-0"
              onClick={() => onNavigate(null)}
            >
              <Home size={14} />
              Files
            </button>
          </li>
          {segments.map((segment, i) => {
            const isLast = i === segments.length - 1;

            return (
              <li key={segment.id}>
                {isLast ? (
                  <span className="btn btn-ghost btn-sm px-0 font-semibold">
                    {segment.name}
                  </span>
                ) : (
                  <button
                    className="btn btn-ghost btn-sm px-0"
                    onClick={() => onNavigate(segment.id)}
                  >
                    {segment.name}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    );
  },
);

Breadcrumbs.displayName = "Breadcrumbs";
