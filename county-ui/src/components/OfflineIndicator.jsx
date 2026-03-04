/**
 * OfflineIndicator — polls the backend /health/ endpoint every 30 s.
 * Shows a top banner when the server is unreachable.
 */
import { useEffect, useState, useRef } from "react";
import { WifiOff } from "lucide-react";

const css = `
.offline-banner {
  position:fixed; top:0; left:0; right:0; z-index:9999;
  background:#ef4444; color:#fff;
  padding:9px 20px; font-size:13px; font-weight:600;
  display:flex; align-items:center; justify-content:center; gap:8px;
  animation:slide-down .25s ease;
  box-shadow:0 2px 12px rgba(0,0,0,.25);
}
@keyframes slide-down{ from{transform:translateY(-100%)} to{transform:translateY(0)} }
`;

const POLL_MS = 30_000;

export default function OfflineIndicator() {
  const [offline, setOffline] = useState(false);
  const timer = useRef(null);

  async function check() {
    try {
      const res = await fetch("/health/", { method: "GET", cache: "no-store" });
      setOffline(!res.ok);
    } catch {
      setOffline(true);
    }
  }

  useEffect(() => {
    check();
    timer.current = setInterval(check, POLL_MS);
    return () => clearInterval(timer.current);
  }, []);

  if (!offline) return null;

  return (
    <>
      <style>{css}</style>
      <div className="offline-banner">
        <WifiOff size={15} />
        Backend server is unreachable — data may be outdated.
      </div>
    </>
  );
}
