import Navbar from "../components/Navbar";

export default function AppLayout({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#070707",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Navbar />

      <main style={{ flex: 1 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px" }}>
          {children}
        </div>
      </main>

      <footer
        style={{
          borderTop: "1px solid #222",
          padding: "14px 16px",
          textAlign: "center",
          color: "#cfcfcf",
          fontSize: 13,
          background: "#0b0b0b",
        }}
      >
        Copyright © 2026. International Software Systems, Inc. All rights reserved.
      </footer>
    </div>
  );
}
