import { Component, type PropsWithChildren, type ReactNode } from "react";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-black p-8 font-mono text-green-400">
          {/* Scanline overlay */}
          <div className="pointer-events-none absolute inset-0 z-10 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.15)_0px,rgba(0,0,0,0.15)_1px,transparent_1px,transparent_2px)]" />
          {/* Glitch flicker layer */}
          <div className="pointer-events-none absolute inset-0 z-0 animate-pulse bg-gradient-to-b from-purple-900/10 via-transparent to-cyan-900/10" />

          <div className="relative z-20 w-full max-w-2xl -skew-x-3 border border-cyan-500 bg-black/80 p-8 shadow-[0_0_40px_#00ffff66,0_0_80px_#ff00ff33]">
            {/* Header */}
            <div className="mb-6 flex items-center gap-3 border-b border-pink-500 pb-4">
              <span className="animate-ping text-2xl text-pink-500">▓</span>
              <h2 className="text-2xl font-extrabold tracking-widest text-pink-500 uppercase drop-shadow-[0_0_8px_#ff00ff] [text-shadow:0_0_10px_#ff00ff,0_0_30px_#ff00ff]">
                !! SYSTEM FAILURE !!
              </h2>
              <span className="animate-ping text-2xl text-pink-500">▓</span>
            </div>

            {/* Subheading */}
            <p className="mb-4 text-xs tracking-[0.3em] text-cyan-400 uppercase drop-shadow-[0_0_6px_#00ffff]">
              &gt;&gt; MAINFRAME CORE DUMP DETECTED &lt;&lt;
            </p>

            {/* Error message block */}
            <pre className="relative max-h-60 overflow-auto border border-green-500/40 bg-black p-4 text-sm leading-relaxed break-all whitespace-pre-wrap text-green-300 shadow-[inset_0_0_20px_#00ff0022] before:absolute before:inset-0 before:bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,255,255,0.03)_2px,rgba(0,255,255,0.03)_4px)] before:content-['']">
              <span className="font-bold text-red-500 drop-shadow-[0_0_6px_#ff0000]">
                [ERR]{" "}
              </span>
              {this.state.error.message}
            </pre>

            {/* Footer glitch bar */}
            <div className="mt-6 flex gap-1">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="h-1 flex-1 bg-pink-500 opacity-70"
                  style={{ opacity: Math.random() }}
                />
              ))}
            </div>
            <p className="mt-3 animate-pulse text-right text-xs tracking-widest text-pink-400/60 uppercase">
              &gt; press any key to jack back in_
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
