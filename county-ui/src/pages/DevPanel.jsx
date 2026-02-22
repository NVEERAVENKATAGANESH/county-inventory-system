import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { devApi } from "../api";
import "../styles/dev.css";
const DEV_TTL_MINUTES = 30;

const nowMs = () => Date.now();

const isDevActive = () => {
  const key = localStorage.getItem("devKey") || "";
  const t = parseInt(localStorage.getItem("devKeyTime") || "0", 10);
  if (!key || !t) return false;
  const ageMin = (nowMs() - t) / 60000;
  return ageMin <= DEV_TTL_MINUTES;
};

const lockDev = () => {
  localStorage.removeItem("devKey");
  localStorage.removeItem("devKeyTime");
};

const getFlag = (k, d = false) => {
  const raw = localStorage.getItem(k);
  if (raw === null) return d;
  return raw === "true";
};

const setFlag = (k, v) => {
  localStorage.setItem(k, v ? "true" : "false");
};

export default function DevPanel() {
  const nav = useNavigate();

  const [status, setStatus] = useState("Checking dev access...");
  const [ok, setOk] = useState(false);

  const [flags, setFlags] = useState(() => ({
    FF_ENABLE_IMPORT: getFlag("FF_ENABLE_IMPORT", true),
    FF_ENABLE_EXPORT: getFlag("FF_ENABLE_EXPORT", true),
    FF_ENABLE_AUDIT: getFlag("FF_ENABLE_AUDIT", true),
    FF_ADMIN_ACTIONS: getFlag("FF_ADMIN_ACTIONS", true),
    FF_SHOW_SEARCH: getFlag("FF_SHOW_SEARCH", true),
  }));

  const expiresIn = useMemo(() => {
    const t = parseInt(localStorage.getItem("devKeyTime") || "0", 10);
    if (!t) return 0;
    const ageMin = (nowMs() - t) / 60000;
    return Math.max(0, Math.round(DEV_TTL_MINUTES - ageMin));
  }, [ok]);

  useEffect(() => {
    if (!isDevActive()) {
      setStatus("Dev session expired.");
      setTimeout(() => nav("/_dev", { replace: true }), 400);
      return;
    }

    devApi
      .get("/api/dev/status/")
      .then((res) => {
        setOk(true);
        setStatus(`✅ ${res.data?.message || "Dev access verified"}`);
      })
      .catch((e) => {
        const s = e?.response?.status ?? "?";
        setOk(false);
        setStatus(`❌ Dev denied (status ${s})`);
      });
  }, [nav]);

  const toggle = (k) => {
    const next = { ...flags, [k]: !flags[k] };
    setFlags(next);
    setFlag(k, next[k]);
  };

  const resetFlags = () => {
    const defaults = {
      FF_ENABLE_IMPORT: true,
      FF_ENABLE_EXPORT: true,
      FF_ENABLE_AUDIT: true,
      FF_ADMIN_ACTIONS: true,
      FF_SHOW_SEARCH: true,
    };
    setFlags(defaults);
    Object.entries(defaults).forEach(([k, v]) => setFlag(k, v));
  };

  const logoutDev = () => {
    lockDev();
    nav("/_dev", { replace: true });
  };

  const runDiagnostics = async () => {
    setStatus("Running diagnostics...");
    try {
      const [a, c, low] = await Promise.all([
        devApi.get("/api/assets/?page_size=1"),
        devApi.get("/api/consumables/?page_size=1"),
        devApi.get("/api/consumables/low-stock/"),
      ]);
      setStatus(
        `✅ OK — assets=${a.data?.count ?? 0}, consumables=${c.data?.count ?? 0}, lowStock=${low.data?.count ?? 0}`
      );
    } catch (e) {
      const s = e?.response?.status ?? "?";
      setStatus(`⚠️ Diagnostics failed (status ${s})`);
    }
  };

  return (
    <div className="devpanelWrap">
      <div className="devpanel"> ... </div>
      <div className="devpanel__top">
        <div>
          <div className="devpanel__title">Developer Panel</div>
          <div className="devpanel__sub">
            UI tools & feature flags
            {ok && <span className="devpanel__pill">expires in {expiresIn} min</span>}
          </div>
        </div>

        <div className="devpanel__actions">
          <button className="devpanel__btn" onClick={() => nav("/login")}>
            Go Portal
          </button>
          <button className="devpanel__btn devpanel__btn--danger" onClick={logoutDev}>
            Lock Dev Mode
          </button>
        </div>
      </div>

      <div className={`devpanel__status ${ok ? "devpanel__status--ok" : "devpanel__status--bad"}`}>
        {status}
      </div>

      <div className="devpanel__grid">
        <div className="devpanel__card">
          <div className="devpanel__cardTitle">Branding</div>
          <div className="devpanel__cardDesc">
            Logo path: <b>/public/issi-logo.png</b>
          </div>
        </div>

        <div className="devpanel__card">
          <div className="devpanel__cardTitle">Feature Flags</div>

          <div className="devpanel__toggles">
            <Toggle label="Enable Import" value={flags.FF_ENABLE_IMPORT} onChange={() => toggle("FF_ENABLE_IMPORT")} />
            <Toggle label="Enable Export" value={flags.FF_ENABLE_EXPORT} onChange={() => toggle("FF_ENABLE_EXPORT")} />
            <Toggle label="Show Audit Logs" value={flags.FF_ENABLE_AUDIT} onChange={() => toggle("FF_ENABLE_AUDIT")} />
            <Toggle label="Admin Actions" value={flags.FF_ADMIN_ACTIONS} onChange={() => toggle("FF_ADMIN_ACTIONS")} />
            <Toggle label="Global Search" value={flags.FF_SHOW_SEARCH} onChange={() => toggle("FF_SHOW_SEARCH")} />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button className="devpanel__btn" onClick={resetFlags}>
              Reset
            </button>
            <button className="devpanel__btn" onClick={() => window.location.reload()}>
              Apply
            </button>
          </div>
        </div>

        <div className="devpanel__card">
          <div className="devpanel__cardTitle">Announcement</div>
          <AnnouncementEditor />
        </div>

        <div className="devpanel__card">
          <div className="devpanel__cardTitle">Diagnostics</div>
          <button className="devpanel__btn" onClick={runDiagnostics}>
            Run API Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div className="devpanel__toggle">
      <div>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{label}</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          {value ? "Enabled" : "Disabled"}
        </div>
      </div>

      <button
        className={`devpanel__switch ${value ? "devpanel__switch--on" : ""}`}
        onClick={onChange}
        type="button"
      >
        <span className="devpanel__knob" />
      </button>
    </div>
  );
}

function AnnouncementEditor() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem("ANN_ENABLED") === "true");
  const [text, setText] = useState(() => localStorage.getItem("ANN_TEXT") || "");

  const save = () => {
    localStorage.setItem("ANN_ENABLED", enabled ? "true" : "false");
    localStorage.setItem("ANN_TEXT", text);
    window.location.reload();
  };

  return (
    <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
      <div className="devpanel__toggle">
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Enable Banner</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Show announcement on portal
          </div>
        </div>

        <button
          className={`devpanel__switch ${enabled ? "devpanel__switch--on" : ""}`}
          onClick={() => setEnabled(!enabled)}
          type="button"
        >
          <span className="devpanel__knob" />
        </button>
      </div>

      <textarea
        className="devpanel__textarea"
        placeholder="Scheduled maintenance Sunday 2:00 AM – 3:00 AM"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
      />

      <button className="devpanel__btn" onClick={save}>
        Save
      </button>
    </div>
  );
}
