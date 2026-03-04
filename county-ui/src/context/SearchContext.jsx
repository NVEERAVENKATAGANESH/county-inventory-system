import { createContext, useContext, useMemo, useState, useEffect, useRef } from "react";

const SearchCtx = createContext(null);

export function SearchProvider({ children }) {
  // rawQuery  — value bound to the input (instant)
  // query     — debounced value consumed by pages (300ms delay)
  const [rawQuery, setRawQuery] = useState("");
  const [query,    setQuery]    = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setQuery(rawQuery), 300);
    return () => clearTimeout(timerRef.current);
  }, [rawQuery]);

  const value = useMemo(
    () => ({ query, rawQuery, setQuery: setRawQuery }),
    [query, rawQuery]
  );

  return <SearchCtx.Provider value={value}>{children}</SearchCtx.Provider>;
}

export function useSearch() {
  const ctx = useContext(SearchCtx);
  if (!ctx) throw new Error("useSearch must be used inside <SearchProvider />");
  return ctx;
}
