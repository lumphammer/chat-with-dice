import { Home } from "lucide-react";
import { memo } from "react";

export type BreadcrumbSegment = {
  id: string;
  name: string;
};

export const Breadcrumbs = memo(
  ({
    segments,
    onNavigate,
  }: {
    segments: BreadcrumbSegment[];
    onNavigate: (folderId: string | null, path: string) => void;
  }) => {
    return (
      <nav className="breadcrumbs text-sm">
        <ul>
          <li>
            <button
              className="btn btn-ghost btn-sm gap-1 px-0"
              onClick={() => onNavigate(null, "/files")}
            >
              <Home size={14} />
              Files
            </button>
          </li>
          {segments.map((segment, i) => {
            const path =
              "/files/" +
              segments
                .slice(0, i + 1)
                .map((s) => encodeURIComponent(s.name))
                .join("/");
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
                    onClick={() => onNavigate(segment.id, path)}
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
