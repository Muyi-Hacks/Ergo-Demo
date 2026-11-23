"use client";

import { findQuote, type QuoteRange } from "@/lib/quote";
import type { Source } from "@/lib/types";
import { type ReactNode, useEffect, useMemo } from "react";
import { type ActiveCitation, sourceLabel } from "./cite";

type Props = {
  sources: Source[];
  /** Sources the current brief was built from; others are shown dimmed. */
  includedIds: string[];
  /** Sources that are new since the earlier brief (diff view). */
  newIds?: string[];
  citedLines: Set<string>;
  active: ActiveCitation | null;
};

const KIND_LABEL = { transcript: "Transcript", email: "Email", crm: "CRM record" } as const;

interface Seg {
  start: number;
  end: number;
  className: string;
}

/** Base styling segments for a line (speaker names, email headers, ...). */
function baseSegments(kind: Source["kind"], text: string): Seg[] {
  if (kind === "transcript") {
    const m = /^(\[\d\d:\d\d:\d\d\] )([^:]{2,40}:)/.exec(text);
    if (m) {
      const a = m[1].length;
      const b = a + m[2].length;
      return [
        { start: 0, end: a, className: "font-mono text-[11px] text-stone-400" },
        { start: a, end: b, className: "font-semibold text-stone-800" },
      ];
    }
  }
  if (kind === "email") {
    const m = /^(From|To|Cc|Date|Subject|Attachments):/.exec(text);
    if (m) return [{ start: 0, end: m[0].length, className: "font-semibold text-stone-500" }];
    if (text.startsWith(">")) return [{ start: 0, end: text.length, className: "text-stone-500" }];
  }
  return [];
}

/** Render a line, splitting at style boundaries and at the highlighted quote. */
function renderLine(text: string, segs: Seg[], hl: QuoteRange | null): ReactNode[] {
  const cuts = new Set([0, text.length]);
  for (const s of segs) cuts.add(s.start).add(s.end);
  if (hl) cuts.add(hl.start).add(hl.end);
  const points = [...cuts].sort((a, b) => a - b);
  const out: ReactNode[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [a, b] = [points[i], points[i + 1]];
    if (a === b) continue;
    const cls = segs.find((s) => a >= s.start && b <= s.end)?.className;
    const piece = text.slice(a, b);
    const marked = hl && a >= hl.start && b <= hl.end;
    out.push(
      <span key={a} className={cls}>
        {marked ? <mark className="rounded-[2px] bg-amber-200 px-0 text-inherit">{piece}</mark> : piece}
      </span>,
    );
  }
  return out;
}

export function SourcesPanel({ sources, includedIds, newIds = [], citedLines, active }: Props) {
  // Scroll the clicked citation's line into view.
  useEffect(() => {
    if (!active) return;
    document.getElementById(`line-${active.line}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [active]);

  const highlight = useMemo(() => {
    if (!active) return null;
    const line = sources.flatMap((s) => s.lines).find((l) => l.id === active.line);
    return line ? findQuote(line.text, active.quote) : null;
  }, [active, sources]);

  return (
    <div>
      {/* Jump nav */}
      <nav className="sticky top-0 z-10 -mx-4 flex gap-1.5 overflow-x-auto border-b border-stone-200 bg-stone-50/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6">
        {sources.map((s) => (
          <a
            key={s.id}
            href={`#source-${s.id}`}
            className={`rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap ${
              includedIds.includes(s.id) ? "bg-white text-stone-700 ring-1 ring-stone-200 hover:ring-stone-300" : "text-stone-400"
            }`}
          >
            {sourceLabel(s.id)}
            {newIds.includes(s.id) && <span className="ml-1 inline-block size-1.5 rounded-full bg-indigo-500 align-middle" />}
          </a>
        ))}
      </nav>

      <div className="space-y-6 pt-4">
        {sources.map((s) => {
          const included = includedIds.includes(s.id);
          return (
            <article
              key={s.id}
              id={`source-${s.id}`}
              className={`scroll-mt-14 overflow-hidden rounded-lg border bg-white ${included ? "border-stone-200" : "border-dashed border-stone-200 opacity-50"}`}
            >
              <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-stone-100 bg-stone-50/60 px-4 py-2.5">
                <div className="min-w-0">
                  <span className="mr-2 text-[11px] font-semibold tracking-wide text-stone-400 uppercase">{KIND_LABEL[s.kind]}</span>
                  <span className="font-medium text-stone-900">{s.title}</span>
                  {newIds.includes(s.id) && (
                    <span className="ml-2 rounded bg-indigo-50 px-1.5 py-px text-[11px] font-medium text-indigo-700">New since call 1</span>
                  )}
                </div>
                <span className="text-xs text-stone-500">
                  {s.date}
                  {!included && " · not in this brief's sources"}
                </span>
              </header>
              <ol className={`py-1.5 text-[13px] leading-relaxed ${s.kind === "crm" ? "font-mono text-xs" : ""}`}>
                {s.lines.map((l) => {
                  const isActive = active?.line === l.id;
                  const isCited = included && citedLines.has(l.id);
                  return (
                    <li
                      // Remount the active row on each click so the flash animation replays.
                      key={isActive ? `${l.id}-${active.nonce}` : l.id}
                      id={`line-${l.id}`}
                      className={`grid scroll-mt-16 grid-cols-[2.75rem_1fr] border-l-2 pr-4 ${
                        isActive ? "line-flash border-amber-400 bg-amber-50" : isCited ? "border-indigo-200" : "border-transparent"
                      }`}
                    >
                      <span className="pt-px pr-2 text-right font-mono text-[11px] text-stone-300 select-none">{l.n}</span>
                      <span className="break-words whitespace-pre-wrap text-stone-700">
                        {l.text === "" ? "\u00a0" : renderLine(l.text, baseSegments(s.kind, l.text), isActive ? highlight : null)}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </article>
          );
        })}
      </div>
    </div>
  );
}
