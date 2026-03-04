/**
 * components/ErrorBoundary.jsx
 *
 * Global React error boundary.
 * Wraps the entire app so unhandled render errors show a recovery screen
 * instead of a blank white page.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 */
import { Component } from "react";

const css = `
.eb-root {
  min-height: 100vh;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 40px 24px;
  text-align: center;
  background: var(--bg, #050d1a);
  font-family: 'DM Sans', system-ui, sans-serif;
  animation: eb-in 0.3s ease;
}
@keyframes eb-in { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

.eb-icon {
  width: 72px; height: 72px; border-radius: 20px;
  background: var(--red-dim, rgba(248,113,113,0.13));
  border: 1px solid var(--red-dim, rgba(248,113,113,0.2));
  display: flex; align-items: center; justify-content: center;
  font-size: 32px; margin: 0 auto 22px; flex-shrink: 0;
}
.eb-code {
  font-family: 'DM Mono', monospace;
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1.5px; color: var(--red-text, #fca5a5);
  background: var(--red-dim, rgba(248,113,113,0.13));
  border: 1px solid var(--red-dim, rgba(248,113,113,0.2));
  padding: 4px 12px; border-radius: 999px;
  margin-bottom: 18px; display: inline-block;
}
.eb-title {
  font-size: 24px; font-weight: 700; letter-spacing: -0.5px;
  color: var(--page-title, #f0f7ff); margin-bottom: 10px;
}
.eb-sub {
  font-size: 14px; color: var(--page-sub, #7a9cbf);
  max-width: 380px; line-height: 1.65; margin-bottom: 28px;
}
.eb-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
.eb-btn {
  padding: 10px 20px; border-radius: 10px;
  font-size: 14px; font-weight: 600; font-family: inherit;
  cursor: pointer; transition: all 0.13s;
  border: 1px solid var(--page-card-border, rgba(96,165,250,0.11));
  background: var(--page-btn-bg, #0f1f38);
  color: var(--page-btn-text, #9ab8d8);
  display: inline-flex; align-items: center; gap: 7px;
}
.eb-btn:hover { color: var(--text, #dce7f7); border-color: var(--border-md, rgba(96,165,250,0.20)); }
.eb-btn.primary {
  background: var(--accent-dim, rgba(56,189,248,0.13));
  border-color: var(--accent-glow, rgba(56,189,248,0.28));
  color: var(--accent-text, #7dd3fc);
}
.eb-btn.primary:hover { filter: brightness(1.1); }

.eb-detail {
  margin-top: 28px; max-width: 560px; text-align: left;
  background: var(--page-card-bg, #0a1526);
  border: 1px solid var(--page-card-border, rgba(96,165,250,0.11));
  border-radius: 12px; overflow: hidden;
}
.eb-detail-hdr {
  padding: 10px 16px;
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.8px; color: var(--page-th-text, #4a6e94);
  border-bottom: 1px solid var(--page-card-border, rgba(96,165,250,0.11));
  cursor: pointer; user-select: none;
  display: flex; justify-content: space-between; align-items: center;
}
.eb-detail-body {
  padding: 14px 16px;
  font-family: 'DM Mono', monospace; font-size: 12px;
  color: var(--red-text, #fca5a5); line-height: 1.55;
  max-height: 180px; overflow-y: auto;
  white-space: pre-wrap; word-break: break-all;
}
`;

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, showDetail: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Unhandled render error:", error, info);
  }

  retry() {
    this.setState({ hasError: false, error: null, showDetail: false });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const msg = this.state.error?.message || "Unknown error";
    const stack = this.state.error?.stack || "";

    return (
      <>
        <style>{css}</style>
        <div className="eb-root">
          <div className="eb-icon">💥</div>
          <div className="eb-code">Application Error</div>
          <div className="eb-title">Something went wrong</div>
          <div className="eb-sub">
            An unexpected error occurred in the application. Try refreshing the page —
            if the issue persists, contact your system administrator.
          </div>
          <div className="eb-actions">
            <button className="eb-btn primary" onClick={() => window.location.reload()}>
              ↻ Reload Page
            </button>
            <button className="eb-btn" onClick={() => this.retry()}>
              ↩ Try Again
            </button>
            <button className="eb-btn" onClick={() => window.location.href = "/dashboard"}>
              ← Dashboard
            </button>
          </div>
          {stack && (
            <div className="eb-detail">
              <div
                className="eb-detail-hdr"
                onClick={() => this.setState(s => ({ showDetail: !s.showDetail }))}
              >
                <span>Error Details</span>
                <span>{this.state.showDetail ? "▲" : "▼"}</span>
              </div>
              {this.state.showDetail && (
                <div className="eb-detail-body">{msg}{"\n\n"}{stack}</div>
              )}
            </div>
          )}
        </div>
      </>
    );
  }
}
