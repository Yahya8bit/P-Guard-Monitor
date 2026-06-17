import { Component, type ReactNode } from 'react';

// Renders a small message instead of a white screen if a child render throws.
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Render error:', error);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="grid min-h-[40vh] place-items-center p-8 text-center">
          <div>
            <div className="text-lg font-semibold">Something went wrong</div>
            <p className="mt-1 text-sm text-muted">Unable to display this section.</p>
            <button
              type="button"
              onClick={() => this.setState({ failed: false })}
              className="mt-4 rounded-btn border border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-accent"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
