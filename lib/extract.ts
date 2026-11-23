import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { DealBrief } from "./schema";
import { formatSourcesForPrompt, type Snapshot } from "./sources";
import type { BriefFile } from "./types";
import { checkCitations } from "./verify";

export const MODEL = "claude-opus-5-5";

const SYSTEM_PROMPT = `You write deal briefs for B2B sales reps. You get one deal's raw material (call transcripts, emails, and a CRM record) and produce a one-page brief from the seller's point of view.

Grounding rules (these matter more than completeness):
- Use only the provided sources. Do not use outside knowledge about any company, product, or person.
- Every item needs citations. A citation is one line ID exactly as shown in brackets (e.g. "call1-L48") plus a quote copied verbatim from that line. If a claim spans several lines, cite each line separately.
- If the sources don't state something, write exactly "Not mentioned" (for facts, also status "not_mentioned" and citations []). Don't guess, estimate, or fill in from what is typical. Saying a fact is not mentioned is a correct answer.
- Report what people said, not what the seller hopes. A seller's claim about their product is not a buyer commitment.

Reading the sources:
- Sources are dated. When they disagree, the most recent one wins for "current" fields (budget, timeline, stage); mention the change in the value when it matters (e.g. "$48K ceiling, down from ~$60K").
- The CRM record is a system of record that reps update by hand and may be stale. When a more recent conversation or email contradicts a CRM field, report it in crm_discrepancies, citing both.
- Pay attention to objections that aren't stated as objections: asides, hedges, trailing off ("so part of me's like... you know"), or concerns the rep moved past without answering. Mark them "implied".
- Next steps are the open ones as of the as-of date. Leave out a step if a later source shows it was done, and add any follow-up it created.
- Stakeholders include people who are named as part of the decision but never attended a call. If a person's attitude isn't shown, their stance is not_mentioned.

Style: short, plain, specific. Use numbers, names, and dates from the sources. No marketing language.`;

export function buildUserPrompt(snapshot: Snapshot): string {
  return `Deal: ${snapshot.deal.seller} selling ${snapshot.deal.product} to ${snapshot.deal.buyer}.
Brief as of: ${snapshot.as_of} (${snapshot.label}). Only the sources below exist; nothing after this date has happened yet.

${formatSourcesForPrompt(snapshot.sources)}

Write the deal brief.`;
}

/**
 * One Claude call: sources in, schema-validated brief out. Citations are
 * then checked against the source text.
 */
export async function generateBrief(snapshot: Snapshot, client = new Anthropic()): Promise<BriefFile> {
  // Streamed so long thinking + output can't hit HTTP timeouts; finalMessage()
  // returns the same schema-parsed message as messages.parse().
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    // If a safety classifier declines, the API retries on a fallback model in the same call.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "high",
      format: betaZodOutputFormat(DealBrief),
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(snapshot) }],
  });
  const response = await stream.finalMessage();

  if (response.stop_reason === "refusal") {
    throw new Error(`Model declined to produce a brief (${response.stop_details?.category ?? "no category"}).`);
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("Brief was cut off at max_tokens; the output is incomplete.");
  }
  if (!response.parsed_output) {
    throw new Error(`Model output did not match the schema (stop_reason: ${response.stop_reason}).`);
  }

  const { brief, report } = checkCitations(response.parsed_output, snapshot.sources);

  return {
    snapshot: snapshot.id,
    label: snapshot.label,
    as_of: snapshot.as_of,
    source_ids: snapshot.sources.map((s) => s.id),
    model: response.model,
    generated_at: new Date().toISOString(),
    usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens },
    citation_check: report,
    brief,
  };
}
