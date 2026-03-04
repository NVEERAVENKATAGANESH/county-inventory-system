/**
 * pages/NotFound.jsx — Production upgrade
 * Fully theme-aware (CSS variables), animated entry, quick-links to common pages.
 */
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, Boxes, TriangleAlert, ArrowLeft } from "lucide-react";

const css = `
.nf-root {
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  min-height:70vh; text-align:center; padding:48px 24px;
  font-family:'DM Sans',system-ui,sans-serif;
  animation:nf-in 0.35s cubic-bezier(.16,1,.3,1);
}
@keyframes nf-in { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
.nf-glyph {
  font-size:96px; font-weight:900; letter-spacing:-6px; line-height:1;
  background:linear-gradient(135deg,var(--accent,#38bdf8) 0%,var(--purple,#a78bfa) 100%);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  user-select:none; margin-bottom:8px;
}
.nf-tag {
  display:inline-flex; align-items:center; gap:6px;
  font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1.2px;
  color:var(--text-dim); background:var(--page-card-bg);
  border:1px solid var(--page-card-border); padding:4px 12px;
  border-radius:999px; margin-bottom:22px;
}
.nf-title { font-size:26px; font-weight:700; letter-spacing:-.5px; color:var(--page-title); margin-bottom:10px; }
.nf-sub { font-size:14px; color:var(--page-sub); max-width:320px; line-height:1.7; margin-bottom:32px; }
.nf-actions { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-bottom:36px; }
.nf-btn {
  display:inline-flex; align-items:center; gap:7px; padding:10px 18px;
  border-radius:var(--radius-md); font-size:13.5px; font-weight:500; font-family:inherit;
  cursor:pointer; transition:all 0.13s;
  border:1px solid var(--page-btn-border); background:var(--page-btn-bg); color:var(--page-btn-text);
}
.nf-btn:hover { border-color:var(--border-md); color:var(--text); background:var(--bg-panel2); transform:translateY(-1px); }
.nf-btn.primary { background:var(--accent-dim); border-color:var(--accent-glow); color:var(--accent-text); font-weight:600; }
.nf-btn.primary:hover { background:var(--accent-glow); color:var(--accent); }
.nf-quick { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; }
.nf-quick-label { width:100%; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.7px; color:var(--text-dim); margin-bottom:2px; }
.nf-quick-link {
  display:inline-flex; align-items:center; gap:6px; padding:8px 14px;
  border-radius:var(--radius-md); font-size:13px; font-weight:500;
  font-family:inherit; cursor:pointer;
  background:var(--page-card-bg); border:1px solid var(--page-card-border);
  color:var(--page-td-text); transition:all 0.13s;
}
.nf-quick-link:hover { border-color:var(--accent-glow); color:var(--accent-text); background:var(--accent-dim); }
`;

const QUICK = [
  { label: "Dashboard",   icon: LayoutDashboard, path: "/dashboard"   },
  { label: "Assets",      icon: Package,         path: "/assets"      },
  { label: "Consumables", icon: Boxes,           path: "/consumables" },
  { label: "Low Stock",   icon: TriangleAlert,   path: "/low-stock"   },
];

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <>
      <style>{css}</style>
      <div className="nf-root">
        <div className="nf-glyph">404</div>
        <div className="nf-tag">Page Not Found</div>
        <div className="nf-title">We can't find that page</div>
        <div className="nf-sub">
          The page you're looking for doesn't exist, was moved, or you may not
          have permission to view it.
        </div>
        <div className="nf-actions">
          <button className="nf-btn primary" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} /> Go Back
          </button>
          <button className="nf-btn" onClick={() => navigate("/dashboard")}>
            <LayoutDashboard size={14} /> Dashboard
          </button>
        </div>
        <div className="nf-quick">
          <div className="nf-quick-label">Quick navigation</div>
          {QUICK.map(l => (
            <button key={l.path} className="nf-quick-link" onClick={() => navigate(l.path)}>
              <l.icon size={13} />{l.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
