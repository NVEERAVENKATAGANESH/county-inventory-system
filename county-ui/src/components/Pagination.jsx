/**
 * Pagination.jsx
 *
 * Reusable paginator.
 * Props:
 *   page        – current 1-based page number
 *   totalCount  – total record count from API
 *   pageSize    – records per page (default 50)
 *   onPageChange(n) – called when user clicks a page
 */
import { ChevronLeft, ChevronRight } from "lucide-react";

const css = `
.pgn {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; border-top: 1px solid var(--border);
  flex-wrap: wrap; gap: 10px;
}
.pgn-info {
  font-size: 13px; color: var(--text-muted);
}
.pgn-controls {
  display: flex; align-items: center; gap: 4px;
}
.pgn-btn {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 32px; height: 32px; padding: 0 8px;
  border-radius: 8px; border: 1px solid var(--border);
  background: var(--bg-panel); color: var(--text-muted);
  font-size: 13px; font-weight: 500; cursor: pointer;
  transition: all .13s;
}
.pgn-btn:hover:not(:disabled):not(.active) {
  background: var(--bg-panel2); border-color: var(--border-md); color: var(--text);
}
.pgn-btn.active {
  background: var(--accent); border-color: var(--accent);
  color: #fff; font-weight: 700;
}
.pgn-btn:disabled {
  opacity: .4; cursor: not-allowed;
}
.pgn-ellipsis {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 32px; height: 32px; font-size: 13px; color: var(--text-dim);
  pointer-events: none;
}
`;

export default function Pagination({ page, totalCount, pageSize = 50, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (totalPages <= 1 && totalCount <= pageSize) return null;

  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, totalCount);

  // Build page button list: always show first, last, current ±1, with ellipsis
  function getPageNums() {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const pages = new Set([1, totalPages, page]);
    if (page > 1) pages.add(page - 1);
    if (page < totalPages) pages.add(page + 1);

    const sorted = [...pages].sort((a, b) => a - b);
    const result = [];
    let prev = 0;
    for (const p of sorted) {
      if (p - prev > 2) result.push("...");
      else if (p - prev === 2) result.push(prev + 1);
      result.push(p);
      prev = p;
    }
    return result;
  }

  return (
    <>
      <style>{css}</style>
      <div className="pgn">
        <span className="pgn-info">
          Showing {start}–{end} of {totalCount.toLocaleString()} records
        </span>
        <div className="pgn-controls">
          <button className="pgn-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft size={14} />
          </button>

          {getPageNums().map((p, i) =>
            p === "..." ? (
              <span key={`e${i}`} className="pgn-ellipsis">…</span>
            ) : (
              <button
                key={p}
                className={`pgn-btn${p === page ? " active" : ""}`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            )
          )}

          <button className="pgn-btn" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </>
  );
}
