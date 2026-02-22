import { useEffect } from "react";

export default function Toast({ message, type = "info", onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  const style = {
    position: "fixed",
    right: 18,
    bottom: 18,
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(0,0,0,0.55)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 14px 40px rgba(0,0,0,.45)",
    zIndex: 9999,
    maxWidth: 380,
  };

  return (
    <div style={style}>
      <div style={{ fontSize: 13, opacity: 0.95 }}>
        {type === "success" ? "✅ " : type === "error" ? "❌ " : "ℹ️ "}
        {message}
      </div>
    </div>
  );
}
