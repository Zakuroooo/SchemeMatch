import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";
import { Screening } from "@/components/Screening";
import bn from "../messages/bn.json";
import en from "../messages/en.json";

afterEach(cleanup);

const answer = {
  eligible: [
    {
      slug: "mh-ladki-bahin",
      title: "Mukhyamantri Majhi Ladki Bahin Yojana",
      benefit: "Rs 1,500 per month by direct bank transfer.",
      official_url: "https://example.gov.in/ladki",
      reasons: ["Women aged 21 to 65"],
      also_confirm: ["Must have a bank account linked to Aadhaar"],
    },
  ],
  need_info: [
    {
      slug: "ignoaps",
      title: "Indira Gandhi National Old Age Pension Scheme",
      missing: ["has_bpl_card"],
      other_ways: [],
    },
  ],
  not_eligible: [
    {
      slug: "pm-sym",
      title: "Pradhan Mantri Shram Yogi Maandhan",
      closest_miss: "Age should be between18 and 40 years at the time of enrollment.",
      other_state: false,
      other_ways: [],
    },
    {
      slug: "pmmvy",
      title: "Pradhan Mantri Matru Vandana Yojana",
      closest_miss: "Pregnant Women & Lactating Mothers (PW&LM)",
      other_state: false,
      other_ways: ["Holds an e-Shram card"],
    },
    {
      slug: "wb-annapurna",
      title: "Annapurna Yojana",
      closest_miss: "Scheme of the state WB: for its residents",
      other_state: true,
      other_ways: [],
    },
    {
      slug: "wb-jai-johar",
      title: "Jai Johar",
      closest_miss: "Scheme of the state WB: for its residents",
      other_state: true,
      other_ways: [],
    },
  ],
  next_question: "has_bpl_card",
  disclaimer: "x",
};

function setup(locale: "en" | "bn" = "en") {
  const calls: unknown[] = [];
  const fetcher = (async (_url: string, init: RequestInit) => {
    calls.push(JSON.parse(String(init.body)));
    return new Response(JSON.stringify(answer), { status: 200 });
  }) as unknown as typeof fetch;
  render(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : bn}>
      <Screening fetcher={fetcher} />
    </NextIntlClientProvider>,
  );
  return { calls, user: userEvent.setup() };
}

describe("Screening form", () => {
  it("sends only the answered fields and shows the three result groups", async () => {
    const { calls, user } = setup();
    await user.type(screen.getByLabelText("Age (years)"), "45");
    await user.selectOptions(screen.getByLabelText("Gender"), "female");
    await user.selectOptions(screen.getByLabelText("State"), "MH");
    await user.click(screen.getByRole("button", { name: "Check schemes" }));

    expect(calls).toEqual([{ profile: { age: 45, gender: "female", state: "MH" } }]);
    expect(await screen.findByText("Likely eligible (1)")).toBeTruthy();
    expect(screen.getByText("Mukhyamantri Majhi Ladki Bahin Yojana")).toBeTruthy();
    expect(screen.getByText("Women aged 21 to 65")).toBeTruthy();
    expect(screen.getByText("Must have a bank account linked to Aadhaar")).toBeTruthy();
    expect(screen.getByText("Ask next: Has a BPL card?")).toBeTruthy();
    expect(screen.getByText(/Missing: Has a BPL card\?/)).toBeTruthy();
    expect(screen.getByText("Not eligible (2)")).toBeTruthy();
    // other states' schemes are counted, not listed
    expect(screen.queryByText("Annapurna Yojana")).toBeNull();
    expect(screen.getByText("2 schemes are only for other states.")).toBeTruthy();
    // another way to qualify is shown for a scheme that was missed
    expect(screen.getByText("May still qualify if any of these is true:")).toBeTruthy();
    expect(screen.getByText("Holds an e-Shram card")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Official page" }).getAttribute("href")).toBe(
      "https://example.gov.in/ladki",
    );
  });

  it("keeps typing in the same box (inputs aren't recreated on every key)", async () => {
    const { user } = setup();
    const age = screen.getByLabelText("Age (years)");
    await user.type(age, "38");
    expect((screen.getByLabelText("Age (years)") as HTMLInputElement).value).toBe("38");
    expect(document.activeElement).toBe(screen.getByLabelText("Age (years)"));
  });

  it("points at answers it can't read and sends nothing", async () => {
    const { calls, user } = setup();
    await user.type(screen.getByLabelText("Age (years)"), "abc");
    await user.click(screen.getByRole("button", { name: "Check schemes" }));
    expect(screen.getByRole("alert").textContent).toContain("Age (years)");
    expect(calls).toEqual([]);
  });

  it("works in Bengali, with the scheme texts marked as English", async () => {
    const { user } = setup("bn");
    await user.type(screen.getByLabelText("বয়স (বছর)"), "45");
    await user.click(screen.getByRole("button", { name: "প্রকল্প দেখুন" }));
    expect(await screen.findByText("সম্ভবত যোগ্য (1)")).toBeTruthy();
    expect(screen.getByText("প্রকল্পের নাম ও বিবরণ আপাতত ইংরেজিতে।")).toBeTruthy();
    const title = screen.getByText("Mukhyamantri Majhi Ladki Bahin Yojana");
    expect(title.getAttribute("lang")).toBe("en");
    const options = within(screen.getByLabelText("লিঙ্গ"))
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(options).toEqual(["উত্তর দেওয়া হয়নি", "মহিলা", "পুরুষ", "অন্যান্য"]);
  });
});
