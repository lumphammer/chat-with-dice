import { type PropsWithChildren } from "react";

/**
 * The sliding, absolutely-positioned shell for one panel of the Deck settings
 * dialog. Every panel covers the dialog's stage, so only the topmost is seen —
 * which is how the old three levels of nested scrolling collapse to one.
 *
 * A panel's own content goes in a {@link PanelBody} (which handles being covered
 * by a child panel); any child route is rendered as a *sibling* of that body,
 * inside this frame, so the child stays interactive while the body beneath it is
 * made inert.
 *
 * Sub-panels (`slide`) swish in from the right, disabled under
 * `prefers-reduced-motion`. The off-screen "from" position comes from
 * `@starting-style` (Tailwind's `starting:` variant), so the enter animation is
 * pure CSS — no state flip, no rAF timing race. `will-change-transform` nudges
 * the slide onto the compositor so main-thread jank (e.g. password-manager
 * extensions scanning the newly mounted DOM) can't easily stutter it.
 */
export const PanelFrame = ({
  slide = false,
  children,
}: PropsWithChildren<{ slide?: boolean }>) => {
  // this animation janks when the Bitwarden extension is loaded - seems
  // impossible to fix.
  const slideClasses = slide
    ? "translate-x-0 starting:translate-x-full will-change-transform transition-transform duration-300 ease-out motion-reduce:transition-none"
    : "";

  return (
    <section className={`absolute inset-0 ${slideClasses}`}>{children}</section>
  );
};

PanelFrame.displayName = "PanelFrame";
