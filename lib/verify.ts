import { findQuote } from "./quote";
import type { DealBrief } from "./schema";
import type { Source } from "./sources";

/**
 * Checks every citation in a brief against the numbered source text.
 *
 * - verified:   the quote appears on the cited line.
 * - corrected:  the quote appears on a nearby line (an off-by-one); `line` is fixed.
 * - unverified: the quote isn't found near the cited line. The UI shows these
 *   as unverified instead of hiding them.
 */

export type CitationStatus = "verified" | "corrected" | "unverified";

export interface CheckedCitation {
  line: string;
  quote: string;
  status: CitationStatus;
  /** Original line ID when status is "corrected". */
  cited_line?: string;
}

export interface CitationReport {
  total: number;
  verified: number;
  corrected: number;
  unverified: number;
  unverified_items: { line: string; quote: string }[];
}

/** Same shape as the brief, but every citation carries a verification status. */
export type WithCheckedCitations<T> = T extends (infer U)[]
  ? WithCheckedCitations<U>[]
  : T extends { line: string; quote: string }
    ? CheckedCitation
    : T extends object
      ? { [K in keyof T]: WithCheckedCitations<T[K]> }
      : T;

export function checkCitations<T extends DealBrief>(
  brief: T,
  sources: Source[],
): { brief: WithCheckedCitations<T>; report: CitationReport } {
  const lines = new Map<string, string>();
  for (const s of sources) for (const l of s.lines) lines.set(l.id, l.text);

  const report: CitationReport = { total: 0, verified: 0, corrected: 0, unverified: 0, unverified_items: [] };

  const check = (c: { line: string; quote: string }): CheckedCitation => {
    report.total++;
    const text = lines.get(c.line);
    if (text !== undefined && findQuote(text, c.quote)) {
      report.verified++;
      return { ...c, status: "verified" };
    }
    const m = /^(.*)-L(\d+)$/.exec(c.line);
    if (m) {
      const n = Number(m[2]);
      for (const near of [n - 1, n + 1, n - 2, n + 2]) {
        const id = `${m[1]}-L${near}`;
        const t = lines.get(id);
        if (t !== undefined && findQuote(t, c.quote)) {
          report.corrected++;
          return { line: id, quote: c.quote, status: "corrected", cited_line: c.line };
        }
      }
    }
    report.unverified++;
    report.unverified_items.push(c);
    return { ...c, status: "unverified" };
  };

  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v)) {
        out[k] =
          k === "citations" && Array.isArray(val)
            ? val.map((c) => check(c as { line: string; quote: string }))
            : walk(val);
      }
      return out;
    }
    return v;
  };

  return { brief: walk(brief) as WithCheckedCitations<T>, report };
}
