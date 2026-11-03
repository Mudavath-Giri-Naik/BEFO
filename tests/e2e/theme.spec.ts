import { expect, test } from "@playwright/test"

test("light is the default and the nav switch toggles dark and back", async ({ page, isMobile }) => {
  test.skip(isMobile, "phones switch the theme from the menu (the header has room for the login button instead)")
  await page.goto("/")
  await expect(page.locator("html")).not.toHaveClass(/dark/)
  await page.getByRole("button", { name: "Switch to dark theme" }).click()
  await expect(page.locator("html")).toHaveClass(/dark/)
  await page.reload()
  await expect(page.locator("html")).toHaveClass(/dark/) // remembered, no flash
  await page.getByRole("button", { name: "Switch to light theme" }).click()
  await expect(page.locator("html")).not.toHaveClass(/dark/)
})

test("menu offers light, dark and system", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Menu" }).click()
  await page.getByRole("radio", { name: "dark" }).click()
  await expect(page.locator("html")).toHaveClass(/dark/)
  await expect(page.getByRole("radio", { name: "dark" })).toHaveAttribute("aria-checked", "true")
})

test("footer shows on the home page only", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("contentinfo")).toHaveCount(1)
  for (const path of ["/explore", "/p/annapurna-mess", "/for-owners", "/login", "/demo/demo-mess"]) {
    await page.goto(path)
    await expect(page.getByRole("contentinfo"), path).toHaveCount(0)
  }
})

test("the header has a login button that opens the login page", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("link", { name: /log ?in/i }).filter({ visible: true }).first().click()
  await expect(page).toHaveURL(/\/login$/)
})
