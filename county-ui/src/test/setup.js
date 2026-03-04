import "@testing-library/jest-dom";

// Provide a reliable localStorage mock.
// jsdom 25 + vitest 3 emits a "--localstorage-file" warning and the Storage
// interface methods may be non-functional. A simple keyed store is more robust.
const _store = {};
const localStorageMock = {
  getItem:    (k) => (Object.prototype.hasOwnProperty.call(_store, k) ? _store[k] : null),
  setItem:    (k, v) => { _store[k] = String(v); },
  removeItem: (k) => { delete _store[k]; },
  clear:      () => { Object.keys(_store).forEach((k) => delete _store[k]); },
  get length() { return Object.keys(_store).length; },
  key:        (i) => Object.keys(_store)[i] ?? null,
};
Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  configurable: true,
  writable: true,
});
