/**
 * "What changed since last call": a deterministic diff between two briefs.
 *
 * No model call. Changes are classified by provenance, i.e. which sources an
 * item's citations come from, so the diff can't report a change the sources
 * don't support:
 *
 * - new:       every citation is from a source that arrived after the earlier brief.
 * - updated:   cites both old and new sources (an earlier item with new evidence).
 * - unchanged: cites only sources the earlier brief already had.
 * - dropped:   an earlier item whose cited lines no later item cites again
 *              (done, resolved, or superseded).
 *
 * Facts are matched by key and stakeholders by name. List items are matched by
 * shared cited lines.
 */
import { FACT_KEYS, type FactKey } from "./facts";
import type { BriefFile, CheckedBrief, CheckedCitation } from "./types";

type Cited = { citations: CheckedCitation[] };
export type Provenance = "new" | "updated" | "unchanged";

export const sourceOfLine = (lineId: string) => lineId.replace(/-L\d+$/, "");

function provenance(item: Cited, newSources: Set<string>): Provenance {
  if (!item.citations.length) return "unchanged";
  const fresh = item.citations.filter((c) => newSources.has(sourceOfLine(c.line))).length;
  return fresh === 0 ? "unchanged" : fresh === item.citations.length ? "new" : "updated";
}

const lineSet = (item: Cited) => new Set(item.citations.map((c) => c.line));

export interface ListDiff<T> {
  added: T[];
  updated: { before?: T; after: T }[];
  unchanged: { before?: T; after: T }[];
  dropped: T[];
}

function diffList<T extends Cited>(before: T[], after: T[], newSources: Set<string>): ListDiff<T> {
  const matched = new Set<number>();
  const match = (item: T): T | undefined => {
    const lines = lineSet(item);
    let best = -1;
    let bestOverlap = 0;
    before.forEach((b, i) => {
      const overlap = b.citations.filter((c) => lines.has(c.line)).length;
      if (overlap > bestOverlap) {
        best = i;
        bestOverlap = overlap;
      }
    });
    // Mark every earlier item sharing a line as "still covered", not just the best one.
    before.forEach((b, i) => {
      if (b.citations.some((c) => lines.has(c.line))) matched.add(i);
    });
    return best >= 0 ? before[best] : undefined;
  };

  const out: ListDiff<T> = { added: [], updated: [], unchanged: [], dropped: [] };
  for (const a of after) {
    const p = provenance(a, newSources);
    const b = match(a);
    if (p === "new") out.added.push(a);
    else if (p === "updated") out.updated.push({ before: b, after: a });
    else out.unchanged.push({ before: b, after: a });
  }
  out.dropped = before.filter((_, i) => !matched.has(i));
  return out;
}

type Fact = CheckedBrief["facts"][number];
type Stakeholder = CheckedBrief["stakeholders"][number];

export interface FactChange {
  key: FactKey;
  before?: Fact;
  after?: Fact;
  changed: boolean;
}

export interface StakeholderChange {
  before: Stakeholder;
  after: Stakeholder;
  roleChanged: boolean;
}

export interface BriefDiff {
  newSourceIds: string[];
  before: BriefFile;
  after: BriefFile;
  facts: FactChange[];
  stakeholders: {
    added: Stakeholder[];
    changed: StakeholderChange[];
    unchanged: Stakeholder[];
    removed: Stakeholder[];
  };
  pains: ListDiff<CheckedBrief["pains"][number]>;
  objections: ListDiff<CheckedBrief["objections"][number]>;
  next_steps: ListDiff<CheckedBrief["next_steps"][number]>;
  risks: ListDiff<CheckedBrief["risks"][number]>;
  crm: { added: CheckedBrief["crm_discrepancies"]; total: number };
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

export function diffBriefs(before: BriefFile, after: BriefFile): BriefDiff {
  const newSourceIds = after.source_ids.filter((id) => !before.source_ids.includes(id));
  const newSources = new Set(newSourceIds);
  const A = before.brief;
  const B = after.brief;

  const facts: FactChange[] = FACT_KEYS.map((key) => {
    const b = A.facts.find((f) => f.key === key);
    const a = B.facts.find((f) => f.key === key);
    const changed = !!a && (a.status !== b?.status || provenance(a, newSources) !== "unchanged");
    return { key, before: b, after: a, changed };
  });

  const byName = new Map(A.stakeholders.map((s) => [norm(s.name), s]));
  const seen = new Set<string>();
  const stakeholders: BriefDiff["stakeholders"] = { added: [], changed: [], unchanged: [], removed: [] };
  for (const s of B.stakeholders) {
    const prev = byName.get(norm(s.name));
    seen.add(norm(s.name));
    if (!prev) stakeholders.added.push(s);
    // Seller reps change only if their role does; new mentions of them aren't news.
    else if (prev.role !== s.role || (s.side === "buyer" && provenance(s, newSources) !== "unchanged"))
      stakeholders.changed.push({ before: prev, after: s, roleChanged: prev.role !== s.role });
    else stakeholders.unchanged.push(s);
  }
  stakeholders.removed = A.stakeholders.filter((s) => !seen.has(norm(s.name)));

  const crmFieldsBefore = new Set(A.crm_discrepancies.map((d) => norm(d.field)));

  return {
    newSourceIds,
    before,
    after,
    facts,
    stakeholders,
    pains: diffList(A.pains, B.pains, newSources),
    objections: diffList(A.objections, B.objections, newSources),
    next_steps: diffList(A.next_steps, B.next_steps, newSources),
    risks: diffList(A.risks, B.risks, newSources),
    crm: {
      added: B.crm_discrepancies.filter((d) => !crmFieldsBefore.has(norm(d.field))),
      total: B.crm_discrepancies.length,
    },
  };
}
