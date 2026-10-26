import type { Field } from "@schemematch/engine";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { START, answer, back, retrySkipped, skip, type Answer, type Flow } from "@/lib/flow";

interface Screening {
  flow: Flow;
  answer: (field: Field, value: Answer) => void;
  skip: (field: Field) => void;
  back: () => void;
  retrySkipped: () => void;
  reset: () => void;
}

const ScreeningContext = createContext<Screening | null>(null);

/** Holds the answers in memory only. Nothing is written to the phone or sent anywhere yet. */
export function ScreeningProvider({ children, initial }: { children: ReactNode; initial?: Flow }) {
  const [flow, setFlow] = useState<Flow>(initial ?? START);
  const value = useMemo<Screening>(
    () => ({
      flow,
      answer: (field, v) => setFlow((f) => answer(f, field, v)),
      skip: (field) => setFlow((f) => skip(f, field)),
      back: () => setFlow((f) => back(f)),
      retrySkipped: () => setFlow((f) => retrySkipped(f)),
      reset: () => setFlow(START),
    }),
    [flow],
  );
  return <ScreeningContext.Provider value={value}>{children}</ScreeningContext.Provider>;
}

export function useScreening(): Screening {
  const ctx = useContext(ScreeningContext);
  if (!ctx) throw new Error("useScreening needs a ScreeningProvider");
  return ctx;
}
