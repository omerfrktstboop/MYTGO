import React from "react";
import ReactDOM from "react-dom/client";

import AppRoot from "./AppRoot.jsx";
import "./styles/index.css";
import { ThemeProvider } from "./ui/system.js";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <AppRoot />
    </ThemeProvider>
  </React.StrictMode>,
);
