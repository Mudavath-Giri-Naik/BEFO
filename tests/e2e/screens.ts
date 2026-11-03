/** pnpm screens — saves screenshots of the main public screens to docs/screens (375/768/1280, light/dark). */
import { chromium } from "@playwright/test"

const BASE = process.env.BASE_URL ?? "http://localhost:4173"
const PAGES = [["home", "/"], ["explore", "/explore"], ["place-hostel", "/p/sri-lakshmi-ladies-hostel"], ["place-mess", "/p/annapurna-mess"], ["owner-demo", "/demo/demo-mess"], ["login", "/login"]]
const SIZES = [375, 768, 1280]

const browser = await chromium.launch()
for (const scheme of ["light", "dark"] as const) {
  for (const w of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 812 : 900 }, colorScheme: scheme, deviceScaleFactor: 1, reducedMotion: "reduce" })
    const page = await ctx.newPage()
    for (const [name, path] of PAGES) {
      await page.goto(BASE + path, { waitUntil: "networkidle" })
      await page.waitForTimeout(300)
      await page.screenshot({ path: `docs/screens/${name}-${w}-${scheme}.png`, fullPage: true })
    }
    await ctx.close()
  }
}
await browser.close()
console.log("Saved to docs/screens/")
