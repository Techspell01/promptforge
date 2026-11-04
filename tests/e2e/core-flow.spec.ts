// Acceptance: a stranger can generate, trim and export in under 60 seconds, with no account.
import { expect, test, type Page } from "@playwright/test";

async function openApp(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Describe the build" })).toBeVisible();
}

async function chooseType(page: Page, label: string): Promise<void> {
  await page.getByRole("button", { name: /^Options/ }).click();
  const sheet = page.getByRole("dialog", { name: "Options" });
  await sheet.getByRole("radiogroup", { name: "Type" }).getByRole("radio", { name: label }).click();
  await sheet.getByRole("button", { name: "Done" }).click();
  await expect(sheet).toBeHidden();
}

test("generate, trim, export and save in under 60 seconds with no sign-in", async ({ page }) => {
  const started = Date.now();
  await openApp(page);

  await page
    .getByRole("textbox", { name: "Idea" })
    .fill("A CLI that converts CSV from stdin to JSON on stdout, with a --pretty flag.");
  await chooseType(page, "CLI tool");
  await page.getByRole("button", { name: "Generate", exact: true }).click();

  const prompt = page.getByRole("region", { name: "Generated prompt" });
  await expect(prompt.locator("pre")).toContainText("## 1 ROLE", { timeout: 45_000 });
  await expect(prompt.locator("pre")).toContainText("SECURITY");
  await expect(prompt.locator("pre")).not.toContainText("Android");

  const tokensBefore = Number(await prompt.getByTestId("token-count").innerText());
  await prompt.getByRole("button", { name: "Edit sections" }).click();
  const sections = page.getByRole("dialog", { name: "Edit sections" });
  await sections.getByRole("checkbox", { name: "Include" }).nth(3).uncheck();
  await expect(async () => {
    const tokensAfter = Number(await prompt.getByTestId("token-count").innerText());
    expect(tokensAfter).toBeLessThan(tokensBefore);
  }).toPass({ timeout: 10_000 });

  await sections.getByRole("button", { name: "Done" }).click();

  await prompt.getByRole("button", { name: "Export" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("dialog", { name: "Export" }).getByRole("button", { name: ".md" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.md$/);

  await prompt.getByRole("button", { name: "Save to library" }).click();
  await expect(prompt.getByText("Saved to library.")).toBeVisible();
  expect(Date.now() - started).toBeLessThan(60_000);

  await page.getByRole("link", { name: "Library" }).click();
  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "A CLI that converts CSV" })).toHaveCount(1);
});

test("protected sections cannot be disabled", async ({ page }) => {
  await openApp(page);
  await page.getByRole("textbox", { name: "Idea" }).fill("A CLI that renames photos by EXIF date.");
  await chooseType(page, "CLI tool");
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  const prompt = page.getByRole("region", { name: "Generated prompt" });
  await expect(prompt.locator("pre")).toContainText("## 1 ROLE", { timeout: 45_000 });
  await prompt.getByRole("button", { name: "Edit sections" }).click();
  const sections = page.getByRole("dialog", { name: "Edit sections" });
  await expect(sections.getByRole("checkbox", { name: "Required" })).toHaveCount(2);
  for (const box of await sections.getByRole("checkbox", { name: "Required" }).all())
    await expect(box).toBeDisabled();
});

test("security headers are set", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["strict-transport-security"]).toContain("max-age=");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["x-powered-by"]).toBeUndefined();
});
