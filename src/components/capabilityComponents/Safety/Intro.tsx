import { memo } from "react";

export const Intro = memo(() => {
  return (
    <section className="mt-4">
      <p className="muted text-sm">
        Visit{" "}
        <a
          className="link link-hover link-accent"
          href="https://ttrpgsafetytoolkit.com/"
          target="_new"
        >
          TTRPG Safety Toolkit
        </a>{" "}
        for more information about safety tools for your group.
      </p>
    </section>
  );
});

Intro.displayName = "Intro";
