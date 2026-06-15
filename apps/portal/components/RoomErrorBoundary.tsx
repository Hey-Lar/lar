'use client';

/**
 * RoomErrorBoundary — keeps one Room's runtime crash from blanking the whole app.
 *
 * If a Room throws while rendering, we show a calm fallback (with a "try again") instead
 * of a white screen — directly serving the "robust, doesn't break" bar. Error boundaries
 * must be class components (React has no hook for `componentDidCatch` yet). Keyed by the
 * active tab in Dashboard, so navigating away clears a crashed Room.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Shown in the fallback so the user knows which Room hiccuped. */
  roomLabel?: string;
}

interface State {
  error: Error | null;
}

export class RoomErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Dev-time signal only; never ships user data anywhere.
    if (process.env.NODE_ENV !== 'production') {
      console.error('Room crashed:', error, info.componentStack);
    }
  }

  private reset = (): void => this.setState({ error: null });

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="block-pad">
          <div className="head">
            <div>
              <div className="eyebrow">Something hiccuped</div>
              <h1 className="h1">{this.props.roomLabel ?? 'This room'} hit a snag</h1>
            </div>
          </div>
          <p className="lead" style={{ maxWidth: 560 }}>
            Lar caught the error so the rest of your home keeps working. Your data is untouched —
            nothing was lost or sent anywhere.
          </p>
          <div className="card" style={{ maxWidth: 560, marginTop: 8 }}>
            <p className="note" style={{ marginTop: 0 }}>
              {this.state.error.message || 'Unknown error.'}
            </p>
            <div className="btn-row">
              <button className="btn primary" type="button" onClick={this.reset}>
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
