/**
 * main.jsx — Fixed
 *
 * Removed duplicate `import "./styles/app.css"` — App.jsx already imports it.
 * Double-importing causes no runtime error but wastes a network request.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);