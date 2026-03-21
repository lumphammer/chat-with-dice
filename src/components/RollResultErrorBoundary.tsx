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
    console.error("Couldn't parse roll result", error);
    return { error };
  }

  render(): ReactNode {
    if (this.state.error) {
      return "(Couldn't parse roll result)";
    }

    return this.props.children;
  }
}
