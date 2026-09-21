import type { ToolDefinition, ToolContext } from "./types";
import { ok, fail } from "./types";

/**
 * askUserQuestion — ask the user to pick between options.
 *
 * The question UI lives in the overlay; the main process wires the resolver
 * through ToolContext.askUserQuestion.
 */

export interface QuestionOption {
  label: string;
  description: string;
  recommended: boolean;
}

export interface NormalizedQuestion {
  question: string;
  options: QuestionOption[];
}

/** Validate and normalize the model-provided questions. */
export function normalizeQuestions(raw: unknown): NormalizedQuestion[] {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 5) {
    throw new Error("questions must contain between 1 and 5 items");
  }

  return raw.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error("question " + (index + 1) + " must be an object");
    const rec = item as Record<string, unknown>;
    // Accept a few common field spellings the model may reach for.
    const question = String(rec.question ?? rec.text ?? rec.title ?? "").trim();
    if (!question) throw new Error("question " + (index + 1) + " must have non-empty text");

    if (!Array.isArray(rec.options) || rec.options.length !== 3) {
      throw new Error("question " + (index + 1) + " must have exactly 3 options");
    }

    const options: QuestionOption[] = rec.options.map((option, optionIndex) => {
      if (typeof option === "string") {
        const label = option.trim();
        if (!label) throw new Error("question " + (index + 1) + " option " + (optionIndex + 1) + " is empty");
        return { label, description: "", recommended: optionIndex === 0 };
      }
      if (!option || typeof option !== "object") {
        throw new Error("question " + (index + 1) + " option " + (optionIndex + 1) + " must be an object");
      }
      const opt = option as Record<string, unknown>;
      // Accept label / value / text as the visible option text.
      const label = String(opt.label ?? opt.value ?? opt.text ?? "").trim();
      if (!label) throw new Error("question " + (index + 1) + " option " + (optionIndex + 1) + " is empty");
      return {
        label,
        description: opt.description ? String(opt.description) : "",
        recommended: optionIndex === 0 || opt.recommended === true,
      };
    });

    return { question, options };
  });
}

interface AskParams {
  questions: unknown;
}

export const AskUserQuestionTool: ToolDefinition<AskParams> = {
  name: "askUserQuestion",
  signature: "askUserQuestion(questions)",
  description:
    "Ask the user up to 5 questions, each with exactly 3 options (the first is recommended). " +
    "Use only for a real choice or ambiguity that cannot be resolved by inspecting the project.",
  risky: true,
  mapArgs: (a) => ({ questions: a[0] }),
  async execute(params: AskParams, ctx: ToolContext) {
    let questions: NormalizedQuestion[];
    try {
      questions = normalizeQuestions(params.questions);
    } catch (err) {
      return fail(
        "Invalid questions: " +
          (err as Error).message +
          '. Each item needs { question: string, options: [3 strings or {label}] }.',
      );
    }
    if (typeof ctx.askUserQuestion !== "function") {
      return fail("askUserQuestion is not available in this window");
    }
    try {
      const answers = await ctx.askUserQuestion(questions);
      return ok({ answers });
    } catch (err) {
      return fail("Failed to get the user's answer: " + (err as Error).message);
    }
  },
};
