import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <h2>Not Found</h2>
      <p style={{ opacity: 0.75 }}>That page does not exist.</p>
      <Link className="btn" to="/dashboard">Go Dashboard</Link>
    </div>
  );
}
