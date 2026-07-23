import { Link } from "#/lib/minirouter";
import type { AnyStep } from "#/lib/minirouter";
import { ChevronRight } from "lucide-react";
import { memo } from "react";

/**
 * A large tappable row on the Deck settings root panel: a feature's name, a
 * summary of its current setting, and a chevron. Tapping it navigates to that
 * feature's own panel. Sized for touch (MISSION: phones are first-class).
 */
export const SettingRow = memo(
  ({
    label,
    summary,
    to,
    disabled,
  }: {
    label: string;
    summary: string;
    to: AnyStep;
    disabled: boolean;
  }) => {
    return (
      <Link
        to={to}
        disabled={disabled}
        className="hover:bg-base-200 flex w-full items-center gap-3 rounded-lg
          p-3 text-left disabled:opacity-50"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{label}</span>
          <span className="text-base-content/60 block truncate">{summary}</span>
        </span>
        <ChevronRight
          size={20}
          className="text-base-content/60 shrink-0"
          aria-hidden="true"
        />
      </Link>
    );
  },
);

SettingRow.displayName = "SettingRow";
