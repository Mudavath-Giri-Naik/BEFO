import { expect, test } from "@playwright/test"

test("light is the default and the nav switch toggles dark and back", async ({ page }) => {
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
