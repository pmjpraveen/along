// Puts the server-rendered home page into dist/index.html. The page stays hidden (data-ssr) until the client app has mounted, so the visitor never
// sees the static copy flicker into the animated one; crawlers and no-script browsers still read it.
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const { render } = await import(pathToFileURL(new URL("../dist-ssr/prerender.js", import.meta.url).pathname).href);
const html = fs.readFileSync("dist/index.html", "utf8");
if (!html.includes('<div id="root"></div>')) throw new Error("dist/index.html has no empty root to fill");
fs.writeFileSync("dist/index.html", html.replace('<div id="root"></div>', `<div id="root" data-ssr>${render()}</div>`));
fs.rmSync("dist-ssr", { recursive: true, force: true });
console.log("home page prerendered");
