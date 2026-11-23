"use client";

import type { CheckedCitation } from "@/lib/types";

export interface ActiveCitation {
  line: string;
  quote: string;
  /** Increments on every click so re-clicking the same chip re-scrolls and re-flashes. */
  nonce: number;
}

export type OnCite = (c: CheckedCitation) => void;

/** "call1" → "Call 1", "email4" → "Email 4", "crm" → "CRM". */
export function sourceLabel(sourceId: string): string {
  if (sourceId === "crm") return "CRM";
  const m = /^([a-z]+)(\d+)$/.exec(sourceId);
  return m ? `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]}` : sourceId;
}

export function splitLineId(lineId: string): { source: string; n: number } {
  const m = /^(.*)-L(\d+)$/.exec(lineId);
  return m ? { source: m[1], n: Number(m[2]) } : { source: lineId, n: 0 };
}

export function isNotMentioned(v: string | undefined | null): boolean {
  return !v || v.trim().toLowerCase().replace(/\.$/, "") === "not mentioned";
}

const STATUS_STYLE: Record<CheckedCitation["status"], string> = {
  verified: "border-stone-200 bg-white text-stone-600 hover:border-indigo-300 hover:text-indigo-700",
  corrected: "border-stone-200 bg-white text-stone-600 hover:border-indigo-300 hover:text-indigo-700",
  unverified: "border-red-300 bg-red-50 text-red-700 hover:border-red-400",
};

export function CiteChips({
  citations,
  onCite,
  active,
  emphasizeSources,
}: {
  citations: CheckedCitation[];
  onCite: OnCite;
  active: ActiveCitation | null;
  /** Sources whose chips get an accent (used by the diff to mark new evidence). */
  emphasizeSources?: Set<string>;
}) {
  // The model sometimes cites one line twice with different quotes; show one chip per line.
  const unique = citations.filter((c, i) => citations.findIndex((d) => d.line === c.line) === i);
  if (!unique.length) return null;
  return (
    <span className="inline-flex flex-wrap gap-1 align-middle">
      {unique.map((c, i) => {
        const { source, n } = splitLineId(c.line);
        const isActive = active?.line === c.line && active.quote === c.quote;
        const title =
          c.status === "unverified"
            ? `Quote not found in source: “${c.quote}”`
            : c.status === "corrected"
              ? `“${c.quote}” (model cited ${c.cited_line}; matched on ${c.line})`
              : `“${c.quote}”`;
        return (
          <button
            key={`${c.line}-${i}`}
            type="button"
            onClick={() => onCite(c)}
            title={title}
            className={`cursor-pointer rounded border px-1.5 py-px font-mono text-[11px] leading-4 whitespace-nowrap transition-colors ${
              isActive
                ? "border-indigo-500 bg-indigo-600 text-white hover:text-white"
                : c.status !== "unverified" && emphasizeSources?.has(source)
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-400"
                  : STATUS_STYLE[c.status]
            }`}
          >
            {c.status === "unverified" && "⚠ "}
            {sourceLabel(source)} · L{n}
          </button>
        );
      })}
    </span>
  );
}
