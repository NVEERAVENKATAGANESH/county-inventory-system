/**
 * KeyboardShortcuts — press "?" anywhere to open shortcut reference.
 * Press Escape or "?" again to close.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Keyboard, X } from "lucide-react";

const SHORTCUTS = [
  { key: "?",      desc: "Open / close this shortcuts panel" },
  { key: "G D",    desc: "Go to Dashboard" },
  { key: "G A",    desc: "Go to Assets" },
  { key: "G C",    desc: "Go to Consumables" },
  { key: "G L",    desc: "Go to Low Stock" },
  { key: "G U",    desc: "Go to Audit Logs" },
  { key: "G M",    desc: "Go to Maintenance" },
  { key: "G R",    desc: "Go to Reports" },
  { key: "G Q",    desc: "Go to Request Queue" },
  { key: "G S",    desc: "Go to Settings" },
  { key: "G N",    desc: "Go to Users (Admin)" },
  { key: "Esc",    desc: "Close modal / cancel edit" },
  { key: "Ctrl+P", desc: "Print current page (in Reports)" },
];

const css = `
.ks-overlay {
  position:fixed; inset:0; z-index:8000;
  background:rgba(0,0,0,.5); backdrop-filter:blur(3px);
  display:flex; align-items:center; justify-content:center;
  animation:ks-fade .15s ease;
}
@keyframes ks-fade{ from{opacity:0} to{opacity:1} }
.ks-modal {
  background:var(--page-card-bg); border:1px solid var(--page-card-border);
  border-radius:18px; padding:24px 28px; width:100%; max-width:460px;
  max-height:80vh; overflow-y:auto;
  box-shadow:0 20px 60px rgba(0,0,0,.3);
  animation:ks-up .18s ease;
}
@keyframes ks-up{ from{transform:translateY(12px);opacity:0} to{transform:translateY(0);opacity:1} }
.ks-title {
  font-size:18px; font-weight:700; color:var(--page-title);
  display:flex; align-items:center; gap:10px; margin:0 0 18px;
  justify-content:space-between;
}
.ks-close {
  background:none; border:1px solid var(--page-card-border); border-radius:7px;
  width:28px; height:28px; cursor:pointer; color:var(--page-sub);
  display:flex; align-items:center; justify-content:center; flex-shrink:0;
}
.ks-close:hover { background:var(--bg-panel2); color:var(--text); }
.ks-row {
  display:flex; align-items:center; justify-content:space-between;
  padding:9px 0; border-bottom:1px solid var(--page-card-border); font-size:14px;
}
.ks-row:last-child { border-bottom:none; }
.ks-key {
  font-family:'DM Mono',monospace; font-size:12px;
  background:var(--bg-panel2); border:1px solid var(--page-card-border);
  border-radius:6px; padding:3px 8px; color:var(--text); white-space:nowrap;
}
.ks-desc { color:var(--page-sub); font-size:13px; }
.ks-hint {
  font-size:12px; color:var(--page-sub); margin-top:14px;
  text-align:center; padding-top:12px; border-top:1px solid var(--page-card-border);
}
`;

export default function KeyboardShortcuts() {
  const navigate  = useNavigate();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(null); // for two-key sequences like "G D"

  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName || "";
      const isInput = ["INPUT","TEXTAREA","SELECT"].includes(tag);

      // "?" opens / closes
      if (e.key === "?" && !isInput) {
        e.preventDefault();
        setOpen(v => !v);
        setPending(null);
        return;
      }

      // Escape closes
      if (e.key === "Escape") {
        setOpen(false);
        setPending(null);
        return;
      }

      if (isInput || open) return;

      const k = e.key.toUpperCase();

      // Two-key nav sequences
      if (pending === "G") {
        const map = {
          D: "/dashboard",
          A: "/assets",
          C: "/consumables",
          L: "/low-stock",
          U: "/audit",
          M: "/maintenance",
          R: "/reports",
          Q: "/requests",
          S: "/settings",
          N: "/users",
        };
        if (map[k]) { navigate(map[k]); }
        setPending(null);
        return;
      }

      if (k === "G") { setPending("G"); return; }
      setPending(null);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, navigate]);

  if (!open) return null;

  return (
    <>
      <style>{css}</style>
      <div className="ks-overlay" onClick={() => setOpen(false)}>
        <div className="ks-modal" onClick={e => e.stopPropagation()}>
          <div className="ks-title">
            <span style={{ display:"flex", alignItems:"center", gap:10 }}>
              <Keyboard size={20} />Keyboard Shortcuts
            </span>
            <button className="ks-close" onClick={() => setOpen(false)}><X size={14} /></button>
          </div>

          {SHORTCUTS.map(s => (
            <div key={s.key} className="ks-row">
              <span className="ks-desc">{s.desc}</span>
              <span className="ks-key">{s.key}</span>
            </div>
          ))}

          <div className="ks-hint">Press <strong>?</strong> or <strong>Esc</strong> to dismiss</div>
        </div>
      </div>
    </>
  );
}
