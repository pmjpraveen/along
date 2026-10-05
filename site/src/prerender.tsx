// Build-time only: renders the home page to a string so its text is in the HTML before any script runs (see scripts/prerender.mjs).
import { renderToString } from "react-dom/server";
import { App } from "./App";

export const render = () => renderToString(<App />);
