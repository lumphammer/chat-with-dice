// ── Scheme header ─────────────────────────────────────────────────────────────
import { memo } from "react";

export const SchemeHeader = memo(
  ({
    schemeDescription,
    ownerName,
    actorName,
    formulaAction,
  }: {
    schemeDescription: string | undefined;
    ownerName: string;
    actorName: string;
    formulaAction: "start" | "explode" | "commit" | "resolve" | "pass";
  }) => {
    const schemeLabel = schemeDescription
      ? `"${schemeDescription}" scheme`
      : "scheme";
    const ownerPossessive = `${ownerName}'s`;

    let text: string;
    if (formulaAction === "explode") {
      text = `Exploding dice for ${ownerPossessive} ${schemeLabel}`;
    } else if (formulaAction === "commit") {
      text = `${actorName} committed to ${ownerPossessive} ${schemeLabel}`;
    } else {
      text = `${ownerPossessive} ${schemeLabel}`;
    }

    return <div className="text-base-content/60 text-xs italic">{text}</div>;
  },
);
SchemeHeader.displayName = "SchemeHeader";
