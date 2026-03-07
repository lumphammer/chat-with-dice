import { ErrorDisplay } from "./ErrorDisplay";
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
        <ErrorDisplay
          message={this.state.error.message}
          detail={this.state.error.stack?.split("\n").slice(1).join("\n")}
        />
      );
    }

    return this.props.children;
  }
}
