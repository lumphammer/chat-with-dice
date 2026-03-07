type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    // Add custom locals here
    user: (typeof import("#/auth").auth.$Infer.Session)["user"] | null;
    session: (typeof import("#/auth").auth.$Infer.Session)["session"] | null;
  }
}
