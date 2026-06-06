import { logger } from "#/utils/logger.ts";
import { Component, type PropsWithChildren, type ReactNode } from "react";

interface State {
  error: Error | null;
}

export class RollResultErrorBoundary extends Component<
  PropsWithChildren,
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    logger.error("Couldn't parse roll result", error);
    return { error };
  }

  render(): ReactNode {
    if (this.state.error) {
      return "(Couldn't parse roll result)";
    }

    return this.props.children;
  }
}
