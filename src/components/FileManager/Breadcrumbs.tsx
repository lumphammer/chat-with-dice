import type { BreadcrumbSegment } from "./types";
import { ChevronRight, Home, type LucideIcon } from "lucide-react";
import { memo, useEffect, useId, useMemo, useRef } from "react";

type BreadcrumbWidths = {
  compact: number;
  full: number;
};

type BreadcrumbsProps = {
  collapsed: boolean;
  onMeasuredWidths?: (widths: BreadcrumbWidths) => void;
  onNavigate: (folderId: string | null) => void;
  segments: BreadcrumbSegment[];
  rootIcon?: LucideIcon;
  rootLabel?: string;
};

const CrumbSeparator = () => (
  <ChevronRight aria-hidden="true" className="shrink-0 opacity-50" size={14} />
);

const RootCrumb = ({
  onNavigate,
  icon: Icon = Home,
  label = "Home",
}: {
  onNavigate: () => void;
  icon?: LucideIcon;
  label?: string;
}) => (
  <button
    type="button"
    className="btn btn-ghost btn-sm shrink-0 gap-1 px-0"
    aria-label={`Go to ${label}`}
    onClick={onNavigate}
  >
    <Icon size={14} />
    {label}
  </button>
);

const CurrentCrumb = ({ name }: { name: string }) => (
  <span
    className="btn btn-ghost btn-sm min-w-0 truncate px-0 font-semibold"
    aria-current="page"
    title={name}
  >
    {name}
  </span>
);

const HiddenSegmentMenu = memo(
  ({
    segments,
    onNavigate,
  }: {
    segments: BreadcrumbSegment[];
    onNavigate: (folderId: string) => void;
  }) => {
    const menuId = useId();
    const anchorName = `--breadcrumbs-${menuId.replaceAll(":", "")}`;
    const menuRef = useRef<HTMLDivElement>(null);

    const handleNavigate = (folderId: string) => {
      menuRef.current?.hidePopover();
      onNavigate(folderId);
    };

    return (
      <>
        <button
          type="button"
          className="btn btn-ghost btn-sm shrink-0 px-1"
          aria-label="Show parent folders"
          popoverTarget={menuId}
          style={{ anchorName } as React.CSSProperties}
        >
          ...
        </button>
        <div
          id={menuId}
          ref={menuRef}
          popover="auto"
          className="dropdown rounded-box bg-base-100 ring-base-200 w-56
            shadow-lg ring-1"
          style={{ positionAnchor: anchorName } as React.CSSProperties}
        >
          <ul className="menu p-1">
            {segments.map((segment) => (
              <li key={segment.id}>
                <button
                  type="button"
                  className="truncate"
                  title={segment.name}
                  onClick={() => handleNavigate(segment.id)}
                >
                  {segment.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </>
    );
  },
);

HiddenSegmentMenu.displayName = "HiddenSegmentMenu";

const MeasurementCrumbs = ({
  compact,
  segments,
  rootIcon,
  rootLabel,
}: {
  compact: boolean;
  segments: BreadcrumbSegment[];
  rootIcon?: LucideIcon;
  rootLabel?: string;
}) => {
  const currentSegment = segments.at(-1);
  const hiddenSegments = currentSegment ? segments.slice(0, -1) : [];

  return (
    <div className="flex w-max items-center gap-1 text-sm whitespace-nowrap">
      <RootCrumb
        onNavigate={() => undefined}
        icon={rootIcon}
        label={rootLabel}
      />
      {compact && currentSegment && hiddenSegments.length > 0 && (
        <>
          <CrumbSeparator />
          <span className="btn btn-ghost btn-sm shrink-0 px-1">...</span>
        </>
      )}
      {compact
        ? currentSegment && (
            <>
              <CrumbSeparator />
              <CurrentCrumb name={currentSegment.name} />
            </>
          )
        : segments.map((segment, i) => {
            const isLast = i === segments.length - 1;

            return (
              <div key={segment.id} className="flex items-center gap-1">
                <CrumbSeparator />
                {isLast ? (
                  <CurrentCrumb name={segment.name} />
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm shrink-0 px-0"
                  >
                    {segment.name}
                  </button>
                )}
              </div>
            );
          })}
    </div>
  );
};

export const Breadcrumbs = memo(
  ({
    collapsed,
    onMeasuredWidths,
    segments,
    onNavigate,
    rootIcon,
    rootLabel,
  }: BreadcrumbsProps) => {
    const fullMeasurementRef = useRef<HTMLDivElement>(null);
    const compactMeasurementRef = useRef<HTMLDivElement>(null);
    const currentSegment = segments.at(-1);
    const hiddenSegments = useMemo(
      () => (currentSegment ? segments.slice(0, -1) : []),
      [currentSegment, segments],
    );

    useEffect(() => {
      if (!onMeasuredWidths) return;
      const fullElement = fullMeasurementRef.current;
      const compactElement = compactMeasurementRef.current;
      if (!fullElement || !compactElement) return;

      const reportWidths = () => {
        onMeasuredWidths({
          compact: compactElement.getBoundingClientRect().width,
          full: fullElement.getBoundingClientRect().width,
        });
      };

      reportWidths();

      const observer = new ResizeObserver(reportWidths);
      observer.observe(fullElement);
      observer.observe(compactElement);
      return () => observer.disconnect();
    }, [onMeasuredWidths, segments]);

    return (
      <nav className="relative min-w-0 flex-1 text-sm" aria-label="Files path">
        <div className="flex min-w-0 items-center gap-1 overflow-hidden">
          <RootCrumb
            onNavigate={() => onNavigate(null)}
            icon={rootIcon}
            label={rootLabel}
          />
          {collapsed && currentSegment ? (
            <>
              <CrumbSeparator />
              <HiddenSegmentMenu
                segments={hiddenSegments}
                onNavigate={onNavigate}
              />
              <CrumbSeparator />
              <CurrentCrumb name={currentSegment.name} />
            </>
          ) : (
            segments.map((segment, i) => {
              const isLast = i === segments.length - 1;

              return (
                <div
                  key={segment.id}
                  className="flex min-w-0 items-center gap-1"
                >
                  <CrumbSeparator />
                  {isLast ? (
                    <CurrentCrumb name={segment.name} />
                  ) : (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm min-w-0 truncate px-0"
                      title={segment.name}
                      onClick={() => onNavigate(segment.id)}
                    >
                      {segment.name}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div
          className="pointer-events-none invisible absolute top-0 left-0 -z-10"
          aria-hidden="true"
        >
          <div ref={fullMeasurementRef}>
            <MeasurementCrumbs
              compact={false}
              segments={segments}
              rootIcon={rootIcon}
              rootLabel={rootLabel}
            />
          </div>
          <div ref={compactMeasurementRef}>
            <MeasurementCrumbs
              compact
              segments={segments}
              rootIcon={rootIcon}
              rootLabel={rootLabel}
            />
          </div>
        </div>
      </nav>
    );
  },
);

Breadcrumbs.displayName = "Breadcrumbs";
