export function ErrorDisplay({
  message,
  detail,
}: {
  message: string;
  detail?: string;
}) {
  return (
    <div
      className="relative flex h-full flex-col items-center justify-center
        overflow-hidden bg-black p-8 font-mono text-green-400
        [--grid-color:var(--color-cyan-500)]"
    >
      {/* Scanline overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-40
          bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.25)_0px,rgba(0,0,0,0.25)_1px,transparent_1px,transparent_2px)]"
      />

      <div
        className="relative z-20 w-full max-w-2xl -skew-x-3 transform-gpu border
          border-cyan-500 bg-black/80 p-8
          shadow-[0_0_40px_#00ffff66,0_0_80px_#ff00ff33]"
      >
        {/* Header */}
        <div
          className="mb-6 flex items-center gap-3 border-b border-pink-500 pb-4"
        >
          <h2
            className="animate-pulse text-2xl font-extrabold tracking-widest
              text-pink-500 uppercase drop-shadow-[0_0_8px_#ff00ff]
              [text-shadow:0_0_10px_#ff00ff,0_0_30px_#ff00ff]"
          >
            &gt; ERROR
          </h2>
        </div>

        {/* Subheading */}
        <p
          className="mb-4 tracking-[0.3em] text-pink-400
            drop-shadow-[0_0_6px_#00ffff]"
        >
          &gt;&gt; {message}
        </p>

        {/* Detail block */}
        {detail && (
          <pre
            className="relative max-h-60 overflow-auto border border-cyan-500/40
              bg-black p-4 text-sm leading-relaxed break-all whitespace-pre-wrap
              text-cyan-300 shadow-[inset_0_0_20px_#00ff0022] before:absolute
              before:inset-0
              before:bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,255,255,0.03)_2px,rgba(0,255,255,0.03)_4px)]
              before:content-['']"
          >
            {detail}
          </pre>
        )}

        {/* Footer glitch bar */}
        <div className="mt-6 flex gap-1">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 bg-pink-500"
              style={{ opacity: Math.random() }}
            />
          ))}
        </div>
        <p className="mt-3 text-right tracking-widest">
          <a
            href="/"
            className="animate-pulse text-cyan-400/60 hover:animate-none
              hover:text-pink-400"
          >
            &gt; go home_
          </a>
        </p>
      </div>
    </div>
  );
}
