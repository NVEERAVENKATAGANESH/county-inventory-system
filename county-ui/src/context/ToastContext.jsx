/**
 * context/ToastContext.jsx — Production upgrade
 *
 * Changes:
 *  - Lucide icons (CheckCircle2, XCircle, AlertTriangle, Info) instead of text
 *  - Animated progress bar countdown per toast
 *  - Colors via CSS variables (theme-aware)
 *  - Slide-in from right animation
 *  - Max 5 stacked toasts; auto-dismiss 4.5s
 *  - Timestamp on each toast
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { registerToast } from "../api";

const ToastCtx = createContext(null);

const VARIANTS = {
  success: { Icon: CheckCircle2, bg: "var(--green-dim)", border: "rgba(52,211,153,0.30)",  iconColor: "var(--green-text)", bar: "var(--green-text)" },
  error:   { Icon: XCircle,      bg: "var(--red-dim)",   border: "rgba(248,113,113,0.30)", iconColor: "var(--red-text)",   bar: "var(--red-text)"   },
  warn:    { Icon: AlertTriangle, bg: "var(--amber-dim)", border: "rgba(251,191,36,0.30)",  iconColor: "var(--amber-text)", bar: "var(--amber-text)" },
  info:    { Icon: Info,          bg: "var(--blue-dim)",  border: "rgba(96,165,250,0.30)",  iconColor: "var(--blue-text)",  bar: "var(--blue-text)"  },
};

const DURATION = 4500;

const css = `
.toast-stack {
  position: fixed; top: 20px; right: 20px;
  display: flex; flex-direction: column-reverse; gap: 8px;
  z-index: 9999; pointer-events: none;
  max-width: 380px; width: calc(100vw - 40px);
}
.toast-item {
  display: flex; align-items: flex-start; gap: 11px;
  padding: 13px 14px 0; border-radius: 13px; border: 1px solid;
  font-family: 'DM Sans', system-ui, sans-serif; font-size: 14px; line-height: 1.45;
  box-shadow: 0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.20);
  pointer-events: all; overflow: hidden; position: relative;
  backdrop-filter: blur(12px);
  animation: t-in 0.25s cubic-bezier(.16,1,.3,1);
}
.toast-item.leaving { animation: t-out 0.22s ease forwards; }
@keyframes t-in  { from{opacity:0;transform:translateX(40px) scale(0.95)} to{opacity:1;transform:translateX(0) scale(1)} }
@keyframes t-out { from{opacity:1;transform:translateX(0) scale(1)} to{opacity:0;transform:translateX(40px) scale(0.95)} }
.toast-body { flex:1; min-width:0; padding-bottom:12px; }
.toast-msg  { color:var(--text-bright,#f0f7ff); font-weight:500; }
.toast-time { font-size:11px; color:var(--text-dim,#3f5e80); margin-top:3px; font-family:'DM Mono',monospace; }
.toast-icon-wrap { margin-top:1px; flex-shrink:0; }
.toast-close {
  flex-shrink:0; margin-top:-2px; background:none; border:none;
  opacity:0.45; cursor:pointer; padding:3px; border-radius:5px;
  display:flex; align-items:center; transition:opacity 0.1s,background 0.1s;
}
.toast-close:hover { opacity:1; background:rgba(255,255,255,0.08); }
.toast-bar-wrap { position:absolute; bottom:0; left:0; right:0; height:3px; background:rgba(255,255,255,0.07); }
.toast-bar { height:100%; border-radius:0 0 0 13px; animation:t-bar linear forwards; }
@keyframes t-bar { from{width:100%} to{width:0%} }
`;

let _id = 0;

function ToastItem({ t, onDismiss }) {
  const v = VARIANTS[t.type] || VARIANTS.info;
  const { Icon } = v;
  return (
    <div
      className={`toast-item${t.leaving ? " leaving" : ""}`}
      style={{ background: v.bg, borderColor: v.border }}
      role="alert" aria-live="polite"
    >
      <div className="toast-icon-wrap"><Icon size={18} style={{ color: v.iconColor }} /></div>
      <div className="toast-body">
        <div className="toast-msg">{t.message}</div>
        <div className="toast-time">{t.timeLabel}</div>
      </div>
      <button className="toast-close" style={{ color: v.iconColor }} onClick={() => onDismiss(t.id)} aria-label="Dismiss">
        <X size={13} />
      </button>
      <div className="toast-bar-wrap">
        <div className="toast-bar" style={{ background: v.bar, animationDuration: `${DURATION}ms` }} />
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    timers.current[id] = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      delete timers.current[id];
    }, 240);
  }, []);

  const addToast = useCallback((message, type = "info") => {
    const id = ++_id;
    const timeLabel = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setToasts(prev => [...prev.slice(-4), { id, message, type, timeLabel, leaving: false }]);
    timers.current[id] = setTimeout(() => dismiss(id), DURATION);
  }, [dismiss]);

  useEffect(() => { registerToast(addToast); return () => registerToast(null); }, [addToast]);
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  return (
    <ToastCtx.Provider value={addToast}>
      <style>{css}</style>
      {children}
      <div className="toast-stack" aria-label="Notifications">
        {toasts.map(t => <ToastItem key={t.id} t={t} onDismiss={dismiss} />)}
      </div>
    </ToastCtx.Provider>
  );
}

/** const toast = useToast(); toast("Saved!", "success") */
export function useToast() { return useContext(ToastCtx); }
