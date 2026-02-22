import { createContext, useContext, useMemo, useState } from "react";

const SearchCtx = createContext(null);

export function SearchProvider({ children }) {
  const [query, setQuery] = useState("");

  const value = useMemo(() => ({ query, setQuery }), [query]);
  return <SearchCtx.Provider value={value}>{children}</SearchCtx.Provider>;
}

export function useSearch() {
  const ctx = useContext(SearchCtx);
  if (!ctx) throw new Error("useSearch must be used inside <SearchProvider />");
  return ctx;
}
