import { expect, test } from "@playwright/test"

// Runs against VITE_DATA_SOURCE=demo (the default .env), so no backend is needed.
test("home → search → place page", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { level: 1 })).toContainText("real seats")
  await page.getByRole("combobox").fill("Madhurawada")
  await page.getByRole("button", { name: /search/i }).click()
  await expect(page).toHaveURL(/explore\?q=Madhurawada/)
  await page.getByRole("link", { name: "Sri Lakshmi Ladies Hostel" }).click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sri Lakshmi Ladies Hostel")
  await expect(page.getByText(/exact address is shared after/i)).toBeVisible()
})

test("filters are kept in the URL", async ({ page }) => {
  await page.goto("/explore?type=hostel&audience=girls")
  await expect(page.getByRole("link", { name: "Sri Lakshmi Ladies Hostel" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Annapurna Mess" })).toHaveCount(0)
})

test("no horizontal scroll at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  for (const path of ["/", "/explore", "/p/annapurna-mess", "/for-owners", "/login"]) {
    await page.goto(path)
    await page.waitForLoadState("networkidle")
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, path).toBeLessThanOrEqual(0)
  }
})

test("protected routes send you to login", async ({ page }) => {
  await page.goto("/app/annapurna-mess")
  await expect(page).toHaveURL(/\/login\?next=/)
})
