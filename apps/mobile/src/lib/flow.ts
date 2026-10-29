import {
  evaluateAll,
  nextQuestion,
  type Field,
  type Profile,
  type SchemeResult,
} from "@schemematch/engine";
import type { CatalogScheme } from "./schemes";

/**
 * Where the person is in the questions. Kept in memory only: nothing here is saved yet.
 * `skipped` = "don't know": the field stays unanswered (UNKNOWN to the engine, never "no").
 */
export interface Flow {
  answers: Profile;
  skipped: Field[];
  /** Fields in the order they were answered or skipped, so Back can undo the last one. */
  history: Field[];
}

export const START: Flow = { answers: {}, skipped: [], history: [] };

export type Answer = Profile[Field];

/**
 * The next question worth asking, or null when no answer could change a result.
 * State comes first: it decides which state schemes can apply at all.
 */
export function currentQuestion(schemes: readonly CatalogScheme[], flow: Flow): Field | null {
  if (flow.answers.state === undefined && !flow.skipped.includes("state")) return "state";
  return nextQuestion(evaluateAll(schemes, flow.answers).results, flow.skipped);
}

/**
 * How far along the person is, 0 to 1, for the progress bar. The total isn't known in advance
 * (each answer can make other questions pointless), so it is estimated as: answered so far,
 * out of answered plus the fields that could still change a result.
 */
export function progress(schemes: readonly CatalogScheme[], flow: Flow): number {
  const open = new Set<Field>();
  for (const r of evaluateAll(schemes, flow.answers).results)
    if (r.result === "UNKNOWN")
      for (const f of r.missing) if (!flow.skipped.includes(f)) open.add(f);
  const done = flow.history.length;
  return done + open.size === 0 ? 1 : done / (done + open.size);
}

export function answer(flow: Flow, field: Field, value: Answer): Flow {
  return {
    answers: { ...flow.answers, [field]: value },
    skipped: flow.skipped.filter((f) => f !== field),
    history: [...flow.history, field],
  };
}

export function skip(flow: Flow, field: Field): Flow {
  return {
    answers: flow.answers,
    skipped: [...flow.skipped, field],
    history: [...flow.history, field],
  };
}

/** Undo the last answer or "don't know". */
export function back(flow: Flow): Flow {
  const last = flow.history.at(-1);
  if (last === undefined) return flow;
  const answers = { ...flow.answers };
  delete answers[last];
  return {
    answers,
    skipped: flow.skipped.filter((f) => f !== last),
    history: flow.history.slice(0, -1),
  };
}

/** "Answer more": ask the skipped questions again, keeping every real answer. */
export function retrySkipped(flow: Flow): Flow {
  return {
    answers: flow.answers,
    skipped: [],
    history: flow.history.filter((f) => !flow.skipped.includes(f)),
  };
}

export interface Match {
  scheme: CatalogScheme;
  result: SchemeResult;
}

export interface Summary {
  eligible: Match[];
  needInfo: Match[];
  /** Not eligible, from schemes that could apply to this person's state. */
  notEligible: Match[];
  /** Another state's schemes: counted, not listed, because they can't apply. */
  otherStates: number;
}

export function summarize(schemes: readonly CatalogScheme[], answers: Profile): Summary {
  const { results } = evaluateAll(schemes, answers);
  const matches = results.map((result, i) => ({ scheme: schemes[i] as CatalogScheme, result }));
  const failed = matches.filter((m) => m.result.result === "FAIL");
  return {
    eligible: matches.filter((m) => m.result.result === "PASS"),
    needInfo: matches.filter((m) => m.result.result === "UNKNOWN"),
    notEligible: failed.filter((m) => !m.result.other_state),
    otherStates: failed.filter((m) => m.result.other_state).length,
  };
}
