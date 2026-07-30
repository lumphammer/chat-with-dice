import { memo } from "react";

export const Credits = memo(() => {
  return (
    <section className="prose mt-4 text-sm opacity-70">
      <h3>Credits</h3>
      The X-card was created by{" "}
      <a href="http://tinyurl.com/x-card-rpg">John Stavropoulos.</a>
    </section>
  );
});

Credits.displayName = "Credits";
