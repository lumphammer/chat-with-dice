import { microscopeClient } from "#/capabilities/microscope/client";
import { SidebarPanel } from "../shared/SidebarPanel";
import { BigPictureField } from "./BigPictureField";
import { Credits } from "./Credits";
import { NewPeriodButton } from "./NewPeriodButton";
import { PeriodBranch } from "./PeriodBranch";
import { memo } from "react";

/**
 * Which end of the timeline a Period is at. The only Period in a history is
 * both bookends at once, which is exactly right for a game that has got as far
 * as its first card.
 */
function bookendsFor(index: number, count: number): ("start" | "end")[] {
  const bookends: ("start" | "end")[] = [];
  if (index === 0) {
    bookends.push("start");
  }
  if (index === count - 1) {
    bookends.push("end");
  }
  return bookends;
}

export const SidebarMicroscopeTimeline = memo(() => {
  const capInfo = microscopeClient.useMount();

  return (
    <SidebarPanel
      title="Timeline"
      isSaving={capInfo.initialised && capInfo.patches.length > 0}
    >
      <BigPictureField />

      {!capInfo.initialised && <p>Loading…</p>}

      {capInfo.initialised && (
        <section>
          <h3 className="heading">History</h3>
          {capInfo.state.periods.length === 0 ? (
            <p className="muted mt-1 text-sm">Nothing yet.</p>
          ) : (
            <ol className="mt-3 flex flex-col gap-2">
              {capInfo.state.periods.map((period, index) => (
                <li key={period.id}>
                  <PeriodBranch
                    period={period}
                    bookends={bookendsFor(index, capInfo.state.periods.length)}
                  />
                </li>
              ))}
            </ol>
          )}
          <NewPeriodButton />
        </section>
      )}

      <Credits />
    </SidebarPanel>
  );
});

SidebarMicroscopeTimeline.displayName = "SidebarMicroscopeTimeline";
