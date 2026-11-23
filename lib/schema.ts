import { z } from "zod";
import { FACT_KEYS, NOT_MENTIONED } from "./facts";

/**
 * Structured output schema for a deal brief. Sent to Claude as the output format
 * (via betaZodOutputFormat) and used to type the result.
 *
 * Design rules:
 * - Every claim carries `citations`: line IDs plus a verbatim quote, which we
 *   check against the source text after the call (lib/verify.ts).
 * - Missing information is the literal string NOT_MENTIONED (and, for facts,
 *   status "not_mentioned"), so the model has a sanctioned way to say "I don't
 *   know" instead of guessing.
 * - Facts and stakeholders are keyed (fact key, person name) so two briefs can be
 *   diffed structurally.
 * - Kept deliberately flat (no nullables, no nested optional objects): structured
 *   outputs compile the schema into a grammar, and that grammar has a size limit.
 */

export { FACT_KEYS, FACT_LABELS, NOT_MENTIONED, type FactKey } from "./facts";

export const Citation = z.object({
  line: z
    .string()
    .describe('Line ID exactly as it appears in the sources, e.g. "call1-L48". One line per citation.'),
  quote: z
    .string()
    .describe(
      "Verbatim excerpt copied character-for-character from that line (the shortest span that supports the claim, under ~20 words). Never paraphrase.",
    ),
});

const citations = z
  .array(Citation)
  .describe("Lines that support this item. At least one, unless the item is not mentioned (then empty).");

const maybe = (what: string) => z.string().describe(`${what} Use exactly "${NOT_MENTIONED}" if the sources don't say.`);

export const Fact = z.object({
  key: z.enum(FACT_KEYS).describe(
    [
      "stage: current sales stage as evidenced by the sources (note it if it differs from the CRM).",
      "budget: buyer's available budget and constraints on it.",
      "pricing: what the seller has quoted.",
      "target_go_live: when the buyer wants to be live, as currently stated.",
      "signature_deadline: any hard date by which a contract must be signed.",
      "decision_process: who recommends, who signs, required approvals and reviews.",
      "competition: alternatives under consideration, including doing nothing or waiting for an incumbent vendor.",
    ].join(" "),
  ),
  status: z.enum(["stated", "not_mentioned"]),
  value: maybe("Concise answer, under 30 words."),
  citations,
});

export const Stakeholder = z.object({
  name: z.string(),
  title: maybe("Job title as stated in the sources."),
  organization: z.string(),
  side: z.enum(["buyer", "seller"]),
  role: z
    .enum([
      "champion",
      "economic_buyer",
      "technical_evaluator",
      "security_approver",
      "procurement",
      "influencer",
      "seller_team",
      "other",
    ])
    .describe("Role in this buying decision, based only on what the sources say."),
  role_evidence: z.string().describe("One short sentence on why this role, grounded in the citations."),
  stance: maybe(
    "This person's own stated or clearly shown attitude toward the purchase, under 20 words. Don't infer from silence.",
  ),
  citations,
});

export const Pain = z.object({
  text: z.string().describe("The problem, in the buyer's terms, under 25 words."),
  quantified_impact: maybe("A number or measurable impact stated in the sources (e.g. '1,840 expired holds in September')."),
  citations,
});

export const Objection = z.object({
  text: z.string().describe("The concern, under 25 words."),
  raised_by: maybe("Who raised it."),
  explicitness: z
    .enum(["explicit", "implied"])
    .describe("implied = signalled through hedging, asides, or trailing off, not stated as an objection."),
  status: z.enum(["unaddressed", "partially_addressed", "resolved"]),
  citations,
});

export const NextStep = z.object({
  action: z.string().describe("Under 20 words."),
  owner: maybe("Person responsible."),
  due: maybe("Due date (YYYY-MM-DD when unambiguous)."),
  citations,
});

export const Risk = z.object({
  text: z.string().describe("What could stall or kill the deal, under 25 words."),
  severity: z.enum(["high", "medium", "low"]),
  citations,
});

export const CrmDiscrepancy = z.object({
  field: z.string().describe("CRM field name, e.g. close_date."),
  crm_value: z.string(),
  sources_value: z.string().describe("What the more recent conversations/emails say instead."),
  citations: citations.describe("Cite both the CRM line and the conflicting source line(s)."),
});

export const DealBrief = z.object({
  summary: z.object({
    text: z.string().describe("Two sentences max: where the deal stands right now."),
    citations,
  }),
  facts: z.array(Fact).describe(`Exactly one entry per key, in this order: ${FACT_KEYS.join(", ")}.`),
  stakeholders: z
    .array(Stakeholder)
    .describe("Everyone named who matters to the decision, on both sides, including people who never attended a call."),
  pains: z.array(Pain),
  objections: z.array(Objection),
  next_steps: z
    .array(NextStep)
    .describe("Open next steps as of the as-of date. Leave out steps a later source shows were completed."),
  risks: z.array(Risk).describe("Ordered most severe first."),
  crm_discrepancies: z
    .array(CrmDiscrepancy)
    .describe("CRM fields contradicted by more recent sources. Empty if the CRM is consistent."),
});

export type DealBrief = z.infer<typeof DealBrief>;
export type Citation = z.infer<typeof Citation>;
export type Fact = z.infer<typeof Fact>;
export type Stakeholder = z.infer<typeof Stakeholder>;
