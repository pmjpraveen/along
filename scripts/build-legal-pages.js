// Writes site/public/privacy/index.html and site/terms/index.html from src/domain/legal.ts, so the app and the website say the same thing.
// Run: node scripts/build-legal-pages.js
const fs = require("fs");
const ts = require("typescript");
const src = fs.readFileSync("src/domain/legal.ts", "utf8");
const mod = { exports: {} };
new Function("module", "exports", ts.transpileModule(src, { compilerOptions: { module: "commonjs" } }).outputText)(mod, mod.exports);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const date = (iso) => { const [y, m, d] = iso.split("-"); return `${Number(d)} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m) - 1]} ${y}`; };
const css = fs.readFileSync("site/public/privacy/index.html", "utf8").match(/<style>([\s\S]*?)<\/style>/)[1];
for (const [dir, doc] of [["privacy", mod.exports.PRIVACY], ["terms", mod.exports.TERMS]]) {
  const body = doc.sections.map((s) => `<h2>${esc(s.heading)}</h2>${s.body.map((p) => `<p>${esc(p)}</p>`).join("")}`).join("");
  fs.writeFileSync(`site/public/${dir}/index.html`, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${doc.title} · along</title><style>${css}</style></head><body><main><h1>${doc.title}</h1><p class="meta">Last updated ${date(doc.updated)}</p><p>${esc(doc.intro)}</p>${body}<nav><a href="/">along</a><a href="/privacy">Privacy policy</a><a href="/terms">Terms of use</a></nav></main></body></html>`);
}
