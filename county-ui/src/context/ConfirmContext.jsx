/**
 * context/ConfirmContext.jsx
 *
 * Production-grade confirm dialog — replaces window.confirm() entirely.
 *
 * Usage:
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *     title:   "Delete 3 assets?",
 *     message: "This action cannot be undone.",
 *     variant: "danger",       // "danger" | "warning" | "info" (default "danger")
 *     confirmLabel: "Delete",  // optional, default "Confirm"
 *     cancelLabel:  "Cancel",  // optional, default "Cancel"
 *   });
 *   if (!ok) return;
 */
import { createContext, useCallback, useContext, useRef, useState } from "react";

const ConfirmCtx = createContext(null);

const VARIANTS = {
  danger:  { border: "var(--red-dim)",   icon: "🗑", btn: "var(--red-text)",   btnBg: "var(--red-dim)"   },
  warning: { border: "var(--amber-dim)", icon: "⚠",  btn: "var(--amber-text)", btnBg: "var(--amber-dim)" },
  info:    { border: "var(--blue-dim)",  icon: "ℹ",  btn: "var(--blue-text)",  btnBg: "var(--blue-dim)"  },
};

const css = `
.cdlg-backdrop {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.60);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  animation: cdlg-bg-in 0.18s ease;
}
@keyframes cdlg-bg-in { from { opacity: 0; } to { opacity: 1; } }

.cdlg-box {
  background: var(--page-card-bg);
  border: 1px solid var(--page-card-border);
  border-radius: 18px;
  box-shadow: var(--shadow-lg), 0 0 0 1px rgba(255,255,255,0.03);
  width: 100%; max-width: 440px;
  overflow: hidden;
  animation: cdlg-in 0.22s cubic-bezier(.16,1,.3,1);
}
@keyframes cdlg-in {
  from { opacity: 0; transform: scale(0.93) translateY(10px); }
  to   { opacity: 1; transform: scale(1)    translateY(0); }
}

.cdlg-header {
  padding: 22px 24px 0;
  display: flex; align-items: center; gap: 14px;
}
.cdlg-icon {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; flex-shrink: 0;
}
.cdlg-title {
  font-size: 17px; font-weight: 700; color: var(--page-title);
  letter-spacing: -0.3px; line-height: 1.2;
}

.cdlg-body {
  padding: 12px 24px 20px 82px;
  font-size: 14px; color: var(--page-sub); line-height: 1.6;
}

.cdlg-footer {
  padding: 0 24px 22px 24px;
  display: flex; justify-content: flex-end; gap: 10px;
}
.cdlg-btn {
  padding: 10px 20px; border-radius: 10px;
  font-size: 14px; font-weight: 600; font-family: inherit;
  cursor: pointer; transition: all 0.13s;
  border: 1px solid var(--page-card-border);
  background: var(--page-btn-bg); color: var(--page-btn-text);
}
.cdlg-btn:hover { border-color: var(--border-md); color: var(--text); background: var(--bg-panel2); }
.cdlg-btn:focus-visible { outline: 2px solid var(--border-focus); outline-offset: 2px; }
.cdlg-btn.primary {
  border-color: transparent;
  font-weight: 700;
  letter-spacing: -0.1px;
}
.cdlg-btn.primary:hover { filter: brightness(1.12); }
`;

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({
        title:        opts.title        || "Are you sure?",
        message:      opts.message      || "",
        variant:      opts.variant      || "danger",
        confirmLabel: opts.confirmLabel || "Confirm",
        cancelLabel:  opts.cancelLabel  || "Cancel",
      });
    });
  }, []);

  function answer(ok) {
    setState(null);
    resolveRef.current?.(ok);
  }

  const v = state ? (VARIANTS[state.variant] || VARIANTS.danger) : null;

  return (
    <ConfirmCtx.Provider value={confirm}>
      <style>{css}</style>
      {children}
      {state && (
        <div className="cdlg-backdrop" onClick={() => answer(false)}>
          <div className="cdlg-box" onClick={e => e.stopPropagation()}>
            <div className="cdlg-header">
              <div className="cdlg-icon" style={{ background: v.btnBg, border: `1px solid ${v.border}` }}>
                {v.icon}
              </div>
              <div className="cdlg-title">{state.title}</div>
            </div>
            {state.message && (
              <div className="cdlg-body">{state.message}</div>
            )}
            <div className="cdlg-footer">
              <button className="cdlg-btn" autoFocus onClick={() => answer(false)}>
                {state.cancelLabel}
              </button>
              <button
                className="cdlg-btn primary"
                style={{ background: v.btnBg, color: v.btn, borderColor: v.border }}
                onClick={() => answer(true)}
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmCtx);
}
