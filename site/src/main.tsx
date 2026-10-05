import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

const root = document.getElementById("root")!;
createRoot(root).render(<StrictMode><App /></StrictMode>);
// The prerendered copy stays hidden until the live app has painted over it.
requestAnimationFrame(() => requestAnimationFrame(() => root.removeAttribute("data-ssr")));
