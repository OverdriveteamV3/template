import { expect, test } from "@playwright/test";

test("shows the reference booking composition", async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 1280) < 768, "The booking panel opens from the sheet below the tablet breakpoint.");
  await page.goto("http://demo-studio.localhost:3000");
  await expect(page.getByRole("heading", { name: "Northline Studio" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Book an Appointment" })).toBeVisible();
  await expect(page.getByText("Sample preview")).toBeVisible();
  await expect(page.getByRole("link", { name: "Powered by Over Drive" })).toHaveAttribute("href", "https://overdriveio.com");
  await expect(page.getByText("AI summary")).toHaveCount(0);
});

test("keeps a date selection available to the keyboard", async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 1280) < 768, "The booking panel opens from the sheet below the tablet breakpoint.");
  await page.goto("http://demo-studio.localhost:3000");
  const date = page.getByRole("radio", { disabled: false }).first();
  await expect(date).toBeVisible();
  await date.focus();
  await page.keyboard.press("Enter");
  await expect(date).toHaveAttribute("aria-checked", "true");
});

test("opens the mobile booking sheet without covering the page beforehand", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://demo-studio.localhost:3000");
  const opener = page.getByRole("button", { name: "Book an Appointment" }).first();
  await expect(opener).toBeVisible();
  await opener.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Northline Studio" })).toBeVisible();
});

test("opens review and explains that the sample cannot reserve", async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 1280) < 768, "The booking panel opens from the sheet below the tablet breakpoint.");
  await page.goto("http://demo-studio.localhost:3000");
  await page.getByRole("radio", { disabled: false }).first().click();
  const dialog = page.getByRole("dialog", { name: /November/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("combobox", { name: "Technician" })).toBeVisible();
  await dialog.getByRole("button", { name: "MORNING" }).click();
  await dialog.getByRole("button", { name: "9:00 AM", exact: true }).click();
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Book Now" }).click();
  await expect(page.getByRole("heading", { name: "Review" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(page.getByText("A saved selection is not a reservation.")).toBeVisible();
});

test("shows a refreshed conflict when the saved time is gone", async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 1280) < 768, "The booking panel opens from the sheet below the tablet breakpoint.");
  await page.goto("http://demo-studio.localhost:3000/?service=11111111-1111-4111-8111-111111111111&date=2026-11-09&start=2026-11-09T14:00:00.000Z&conflict=1");
  await expect(page.getByText("That time is no longer available. The list has been refreshed.")).toBeVisible();
});

test("uses a different accent on the second sample business", async ({ page }) => {
  await page.goto("http://demo-studio.localhost:3000");
  const studio = await page.locator("[style*='--primary']").first().evaluate((node) => getComputedStyle(node).getPropertyValue("--primary").trim());
  await page.goto("http://demo-office.localhost:3000");
  await expect(page.getByRole("heading", { name: "Harbor Office" })).toBeVisible();
  const office = await page.locator("[style*='--primary']").first().evaluate((node) => getComputedStyle(node).getPropertyValue("--primary").trim());
  expect(studio).toBe("#ddf20a");
  expect(office).toBe("#00595b");
});
