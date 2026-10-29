import { FIELDS, type Profile } from "@schemematch/engine";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { Linking } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import LanguageScreen from "../app/index";
import QuestionScreen from "../app/question";
import ResultsScreen from "../app/results";
import SchemeScreen from "../app/scheme/[slug]";
import { I18nProvider, type Lang } from "@/i18n";
import { START, type Flow } from "@/lib/flow";
import { ScreeningProvider } from "@/state/screening";

const mockPush = jest.fn();
let mockSlug = "";
jest.mock("expo-router", () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), dismissAll: jest.fn() },
  Redirect: ({ href }: { href: string }) => {
    const { Text: T } = jest.requireActual("react-native");
    return <T>redirect:{href}</T>;
  },
  useLocalSearchParams: () => ({ slug: mockSlug }),
}));

const SUNITA: Profile = {
  state: "MH",
  gender: "female",
  age: 38,
  marital_status: "widow",
  annual_family_income: 60000,
  has_bpl_card: true,
  children_count: 2,
  is_pregnant_or_lactating: false,
  disability_percent: 0,
  land_acres: 0,
  caste_category: "OBC",
};

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function show(ui: ReactNode, { lang = "en", flow = START }: { lang?: Lang; flow?: Flow } = {}) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <I18nProvider initial={lang}>
        <ScreeningProvider initial={flow}>{ui}</ScreeningProvider>
      </I18nProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => mockPush.mockClear());

describe("language screen", () => {
  it("asks in both languages and opens the questions in the chosen one", () => {
    show(<LanguageScreen />);
    expect(screen.getByText(/আপনার ভাষা বেছে নিন/)).toBeTruthy();
    expect(screen.getByText(/Choose your language/)).toBeTruthy();
    expect(screen.getByText("Checks 30 schemes")).toBeTruthy(); // not "in 2 minutes": that isn't measured
    fireEvent.press(screen.getByRole("button", { name: "বাংলা" }));
    expect(mockPush).toHaveBeenCalledWith("/question");
  });
});

describe("question screen", () => {
  it("starts with the state, in Bengali, and moves on after a tap", () => {
    show(<QuestionScreen />, { lang: "bn" });
    expect(screen.getByRole("header", { name: "আপনি কোন রাজ্যে থাকেন?" })).toBeTruthy();
    expect(screen.getByText("প্রশ্ন ১")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "মহারাষ্ট্র" }));
    expect(screen.queryByText("আপনি কোন রাজ্যে থাকেন?")).toBeNull();
    expect(screen.getByText("প্রশ্ন ২")).toBeTruthy();
  });

  it("refuses a number it can't read, then accepts a real one", () => {
    show(<QuestionScreen />, {
      flow: { answers: { state: "MH" }, skipped: [], history: ["state"] },
    });
    expect(screen.getByRole("header", { name: "How old are you?" })).toBeTruthy();
    const input = screen.getByLabelText("How old are you?");
    fireEvent.changeText(input, "thirty");
    fireEvent.press(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please enter a number from 0 to 120.");
    fireEvent.changeText(input, "38");
    fireEvent.press(screen.getByRole("button", { name: "Next" }));
    expect(screen.queryByRole("header", { name: "How old are you?" })).toBeNull();
  });

  it("'Don't know' moves on and Back brings the question back", () => {
    show(<QuestionScreen />);
    fireEvent.press(screen.getByRole("button", { name: "Don't know" }));
    expect(screen.queryByText("Which state do you live in?")).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Which state do you live in?")).toBeTruthy();
  });

  it("goes to results when no answer could change anything", () => {
    // Sunita's answers plus "don't know" for every other field: nothing is left to ask.
    const rest = FIELDS.filter((f) => SUNITA[f] === undefined);
    show(<QuestionScreen />, { flow: { answers: SUNITA, skipped: rest, history: [] } });
    expect(screen.getByText("redirect:/results")).toBeTruthy();
  });
});

describe("results screen", () => {
  it("shows Sunita her 11 schemes, the other-state count and the disclaimer", () => {
    show(<ResultsScreen />, { flow: { answers: SUNITA, skipped: [], history: [] } });
    expect(screen.getByText("11")).toBeTruthy();
    expect(screen.getByRole("header", { name: "schemes you may qualify for" })).toBeTruthy();
    // 4 picture tiles plus 7 rows, each opening its scheme card.
    expect(screen.getAllByRole("button", { name: /\. Details$/ })).toHaveLength(11);
    expect(screen.getByText("9 schemes are only for other states.")).toBeTruthy();
    // The not-eligible list is folded until asked for.
    expect(screen.queryByText(/Indira Gandhi National Widow Pension Scheme/)).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Show 10 not eligible" }));
    expect(screen.getByText(/Indira Gandhi National Widow Pension Scheme/)).toBeTruthy();
    expect(screen.getByText(/not an official government app/)).toBeTruthy();
  });

  it("in Bengali, says scheme texts are English for now", () => {
    show(<ResultsScreen />, { lang: "bn", flow: { answers: SUNITA, skipped: [], history: [] } });
    expect(screen.getByRole("header", { name: "টি প্রকল্পের যোগ্য হতে পারেন" })).toBeTruthy();
    expect(screen.getByText("১১")).toBeTruthy(); // Bengali digits
    expect(screen.getByText("প্রকল্পের নাম ও বিবরণ আপাতত ইংরেজিতে।")).toBeTruthy();
  });

  it("offers more questions when answers are missing", () => {
    show(<ResultsScreen />, {
      flow: { answers: { state: "MH" }, skipped: ["age"], history: ["state", "age"] },
    });
    fireEvent.press(screen.getByRole("button", { name: "Answer more questions" }));
    expect(mockPush).toHaveBeenCalledWith("/question");
  });
});

describe("scheme screen", () => {
  it("shows only true reasons, real requirements, and opens the official page", () => {
    mockSlug = "mh-sanjay-gandhi-niradhar";
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    show(<SchemeScreen />, { flow: { answers: SUNITA, skipped: [], history: [] } });
    expect(screen.getByText("Destitute widows")).toBeTruthy();
    expect(screen.queryByText(/divorced women not receiving alimony/)).toBeNull(); // she isn't divorced
    // Other ways in are folded after 3; "show more" reveals the rest.
    expect(screen.queryByText("Orphaned children")).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Show 5 more" }));
    expect(screen.getByText("Orphaned children")).toBeTruthy(); // listed as another way in…
    expect(screen.getByText("MAY STILL QUALIFY IF ANY OF THESE IS TRUE:")).toBeTruthy(); // …under its own heading
    expect(screen.queryByText("WHY YOU MAY QUALIFY")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Open the official page" }));
    expect(open).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/sjsa\.maharashtra\.gov\.in\//),
    );
  });

  it("goes back to results for a scheme she isn't eligible for", () => {
    mockSlug = "ignwps";
    show(<SchemeScreen />, { flow: { answers: SUNITA, skipped: [], history: [] } });
    expect(screen.getByText("redirect:/results")).toBeTruthy();
  });
});
