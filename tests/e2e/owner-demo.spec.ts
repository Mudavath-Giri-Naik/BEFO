import { expect, test } from "@playwright/test"

test("owner demo: Today → Inbox → Members, actions are read-only", async ({ page }) => {
  await page.goto("/demo")
  await expect(page).toHaveURL(/\/demo\/demo-mess$/)
  await expect(page.getByRole("heading", { name: /Today/ })).toBeVisible()
  await page.getByText(/things? needs? your answer/).click()
  await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible()
  await page.getByRole("button", { name: "Confirm", exact: true }).first().click()
  await expect(page.getByText("This is demo data. Nothing is saved.")).toBeVisible()
  await page.goto("/demo/demo-boys/members?status=overdue")
  await expect(page.getByRole("heading", { name: /Residents/ })).toBeVisible()
})
