import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import bn from "../messages/bn.json" with { type: "json" };
import en from "../messages/en.json" with { type: "json" };

const API = "http://localhost:3101";

// The Sunita persona from the API tests (apps/api/test/app.test.ts): she gets 11 schemes.
const SUNITA: Record<string, string> = {
  state: "MH",
  gender: "female",
  age: "38",
  marital_status: "widow",
  annual_family_income: "60000",
  has_bpl_card: "yes",
  children_count: "2",
  is_pregnant_or_lactating: "no",
  disability_percent: "0",
  land_acres: "0",
  caste_category: "OBC",
};

/** Fills fields by their stable ids, so the same helper works in every language. */
async function fill(page: Page, answers: Record<string, string>) {
  for (const [field, value] of Object.entries(answers)) {
    const control = page.locator(`#f-${field}`);
    if ((await control.evaluate((el) => el.tagName)) === "SELECT")
      await control.selectOption(value);
    else await control.fill(value);
  }
}

/** Submits and returns the profile the browser sent to the API. */
async function submit(page: Page, button: string) {
  const request = page.waitForRequest(`${API}/eligibility`);
  await page.getByRole("button", { name: button }).click();
  return (await request).postDataJSON().profile as Record<string, unknown>;
}

/** A results group: the block right around its heading. */
const group = (page: Page, title: string) =>
  page.getByRole("heading", { name: title, exact: true }).locator("xpath=..");

// Next.js adds its own empty role="alert" (the route announcer), so alerts are found by text.
const alert = (page: Page, text: string) => page.getByRole("alert").filter({ hasText: text });

test("Sunita gets her 11 schemes with true reasons, and her answers never reach the URL", async ({
  page,
}) => {
  await page.goto("/en");
  await fill(page, SUNITA);
  const sent = await submit(page, en.form.submit);

  // The browser calls the API itself (per-user rate limit), with typed answers.
  expect(sent).toMatchObject({ age: 38, has_bpl_card: true, is_pregnant_or_lactating: false });

  const eligible = group(page, "Likely eligible (11)");
  await expect(eligible.locator(":scope > ul > li")).toHaveCount(11);

  const sanjay = eligible.locator("li", { hasText: "Sanjay Gandhi Niradhar Anudan Yojana" });
  await expect(sanjay).toContainText("Destitute widows");
  await expect(sanjay).not.toContainText("divorced women not receiving alimony"); // she isn't divorced
  await expect(sanjay).not.toContainText("Orphaned children"); // another way in, not a requirement

  await expect(page.getByText("9 schemes are only for other states.")).toBeVisible();
  await expect(page.getByText(en.results.disclaimer)).toBeVisible();
  expect(page.url()).toBe("http://localhost:3100/en");
});

test("the Bengali page screens Sunita the same way", async ({ page }) => {
  await page.goto("/bn");
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  await fill(page, SUNITA);
  await submit(page, bn.form.submit);

  await expect(group(page, "সম্ভবত যোগ্য (11)").locator(":scope > ul > li")).toHaveCount(11);
  await expect(page.getByText(bn.results.englishOnly)).toBeVisible();
  // Scheme texts are English for now, and are marked so screen readers read them as English.
  await expect(page.getByText("Sanjay Gandhi Niradhar Anudan Yojana")).toHaveAttribute(
    "lang",
    "en",
  );
});

test("a blank answer is not sent, so the result asks instead of saying no", async ({ page }) => {
  await page.goto("/en");
  await fill(page, { state: "MH", age: "70" });
  const sent = await submit(page, en.form.submit);

  expect(sent).toEqual({ state: "MH", age: 70 });
  await expect(page.getByText(/^Ask next: /)).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Need more answers \(\d+\)$/ })).not.toHaveText(
    "Need more answers (0)",
  );
});

test("an unreadable number is pointed out and nothing is sent", async ({ page }) => {
  await page.goto("/en");
  let calls = 0;
  page.on("request", (r) => {
    if (r.url().startsWith(API)) calls++;
  });
  await fill(page, { age: "thirty" });
  await page.getByRole("button", { name: en.form.submit }).click();

  await expect(alert(page, en.form.fields.age)).toBeVisible();
  await expect(page.locator("#f-age")).toHaveAttribute("aria-invalid", "true");
  expect(calls).toBe(0);
});

test("when the API can't be reached, the worker sees a plain sentence", async ({ page }) => {
  await page.route(`${API}/**`, (route) => route.abort("internetdisconnected"));
  await page.goto("/en");
  await fill(page, { age: "38" });
  await page.getByRole("button", { name: en.form.submit }).click();
  await expect(alert(page, en.errors.network)).toBeVisible();
});

test("the language switcher keeps the worker on the same page", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("link", { name: en.languages.bn }).click();
  await expect(page).toHaveURL("http://localhost:3100/bn");
  await expect(page.getByRole("link", { name: bn.languages.bn })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await expect(page.getByRole("heading", { name: bn.form.title })).toBeVisible();
});

test("no sideways scrolling, before and after results", async ({ page }) => {
  const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  await page.goto("/en");
  expect(await fits()).toBe(true);
  await fill(page, SUNITA);
  await submit(page, en.form.submit);
  await expect(group(page, "Likely eligible (11)")).toBeVisible();
  expect(await fits()).toBe(true);
});

for (const [locale, m] of [
  ["en", en],
  ["bn", bn],
] as const) {
  test(`no WCAG 2 A/AA problems found by axe (${locale}, with results)`, async ({ page }) => {
    await page.goto(`/${locale}`);
    await fill(page, SUNITA);
    await submit(page, m.form.submit);
    await expect(
      page.getByRole("heading", { name: m.results.eligible.replace("{count}", "11") }),
    ).toBeVisible();
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.length} element(s)`)).toEqual([]);
  });
}
