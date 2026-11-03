/**
 * pnpm build:artifact — builds the demo site as ONE self-contained HTML body (for a claude.ai Artifact
 * preview): scripts, styles, fonts and drawn photo stand-ins inlined; in-memory routing; no service worker.
 * Output: dist-artifact/befo-preview.html
 */
import { execSync } from "node:child_process"
import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import path from "node:path"

execSync("vite build", { stdio: "inherit", env: { ...process.env, VITE_ARTIFACT: "1", VITE_DATA_SOURCE: "demo" } })
const dir = "dist-artifact"
const html = readFileSync(path.join(dir, "index.html"), "utf8")
const assets = readdirSync(path.join(dir, "assets"))
const css = assets.filter((f) => f.endsWith(".css")).map((f) => readFileSync(path.join(dir, "assets", f), "utf8")).join("\n")
const js = assets.filter((f) => f.endsWith(".js")).map((f) => readFileSync(path.join(dir, "assets", f), "utf8")).join("\n")
const themeInit = readFileSync("public/theme-init.js", "utf8")
const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? "BEFO"
const safe = (s: string) => s.replace(/<\/(script|style)/gi, "<\\/$1")

const out = `<title>${title.split(" — ")[0]} preview</title>
<meta name="description" content="BEFO demo preview: hostels, PGs and messes with real seats, real menus and real prices.">
<style>${safe(css)}</style>
<script>${safe(themeInit)}</script>
<div id="root"></div>
<script type="module">${safe(js)}</script>
`
writeFileSync(path.join(dir, "befo-preview.html"), out)
console.log(`dist-artifact/befo-preview.html — ${(out.length / 1024 / 1024).toFixed(2)} MB (${assets.length} assets inlined)`)
