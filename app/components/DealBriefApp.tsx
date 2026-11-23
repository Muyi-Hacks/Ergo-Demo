"use client";

import type { PageData } from "@/lib/data";
import { diffBriefs } from "@/lib/diff";
import type { BriefFile, CheckedCitation, SnapshotId } from "@/lib/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BriefPanel } from "./BriefPanel";
import type { ActiveCitation } from "./cite";
import { DiffPanel } from "./DiffPanel";
import { SourcesPanel } from "./SourcesPanel";

type View = SnapshotId | "diff";

function collectCitedLines(v: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(v)) v.forEach((x) => collectCitedLines(x, out));
  else if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.line === "string" && typeof o.quote === "string") out.add(o.line);
    else Object.values(o).forEach((x) => collectCitedLines(x, out));
  }
  return out;
}

function fmtDate(iso: string) {
  return new Date(iso + (iso.length === 10 ? "T12:00:00" : "")).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function DealBriefApp({ deal, snapshots, sources, briefs }: PageData) {
  const [view, setView] = useState<View>("after_call2");
  const [live, setLive] = useState<Partial<Record<SnapshotId, BriefFile>>>({});
  const [active, setActive] = useState<ActiveCitation | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const nonce = useRef(0);

  const isDiff = view === "diff";
  const snapshot: SnapshotId = isDiff ? "after_call2" : view;
  const current = (id: SnapshotId) => live[id] ?? briefs[id];
  const file = current(snapshot);
  const isLive = Boolean(live[snapshot]);
  const snap = snapshots.find((s) => s.id === snapshot)!;

  const before = current("after_call1");
  const after = current("after_call2");
  const diff = useMemo(() => (before && after ? diffBriefs(before, after) : null), [before, after]);

  const citedLines = useMemo(
    () => (isDiff ? collectCitedLines([before?.brief, after?.brief]) : collectCitedLines(file?.brief)),
    [isDiff, before, after, file],
  );

  const onCite = useCallback((c: CheckedCitation) => {
    nonce.current += 1;
    setActive({ line: c.line, quote: c.quote, nonce: nonce.current });
  }, []);

  // Clear the highlight when switching views.
  useEffect(() => setActive(null), [view]);

  useEffect(() => {
    if (!running) return;
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, [running]);

  async function runLive() {
    setRunning(true);
    setElapsed(0);
    setError(null);
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot }),
      });
      const data = await res.json().catch(() => ({ error: `Request failed (${res.status}).` }));
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status}).`);
      setLive((prev) => ({ ...prev, [snapshot]: data as BriefFile }));
      setActive(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Live run failed.");
    } finally {
      setRunning(false);
    }
  }

  const check = file?.citation_check;
  const tabs: { id: View; label: string; sub?: string }[] = [
    ...snapshots.map((s) => ({ id: s.id as View, label: s.label, sub: fmtDate(s.as_of) })),
    { id: "diff", label: "What changed" },
  ];

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold tracking-tight text-stone-900">Deal Brief</h1>
            <p className="truncate text-sm text-stone-500">
              {deal.seller} → <span className="text-stone-700">{deal.buyer}</span>
            </p>
          </div>

          {/* View toggle */}
          <div
            className="order-last flex w-full rounded-lg bg-stone-100 p-0.5 text-sm md:order-0 md:w-auto"
            role="tablist"
            aria-label="Brief view"
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={t.id === view}
                onClick={() => setView(t.id)}
                disabled={running}
                className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed md:flex-none ${
                  t.id === view ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
                }`}
              >
                {t.id === "diff" && <span className="mr-1.5 inline-block size-1.5 rounded-full bg-indigo-500 align-middle" />}
                {t.label}
                {t.sub && <span className="hidden font-normal text-stone-400 sm:inline"> · {t.sub}</span>}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {check && !isDiff && (
              <span
                className={`hidden text-xs sm:inline ${check.unverified ? "text-red-600" : "text-emerald-700"}`}
                title="Every quote the model cited was checked against the source text."
              >
                {check.unverified ? "⚠" : "✓"} {check.verified + check.corrected}/{check.total} citations verified
              </span>
            )}
            <button
              onClick={runLive}
              disabled={running || isDiff}
              title={isDiff ? "Pick a snapshot to regenerate it live" : "Regenerate this brief with a live Claude call"}
              className="cursor-pointer rounded-lg bg-indigo-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              {running ? `Running… ${elapsed}s` : "Run live"}
            </button>
          </div>
        </div>

        {/* Status strip */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-stone-100 bg-stone-50 px-4 py-1.5 text-xs text-stone-500 sm:px-6">
          {running ? (
            <span>Calling {file?.model ?? "Claude"} with {snap.sources.length} sources. This usually takes 60–90 seconds.</span>
          ) : error ? (
            <span className="text-red-600">{error}</span>
          ) : isDiff ? (
            <span>
              Comparing the brief after call 1 ({fmtDate(snapshots[0].as_of)}) with the brief after call 2 ({fmtDate(snapshots[1].as_of)})
              {(live.after_call1 || live.after_call2) && " · includes live results"}
            </span>
          ) : file ? (
            <>
              <span>
                {isLive ? <span className="font-medium text-indigo-700">Live result</span> : "Precomputed"} · {file.model} ·{" "}
                {new Date(file.generated_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })} ·{" "}
                {file.usage.input_tokens.toLocaleString()} in / {file.usage.output_tokens.toLocaleString()} out tokens
              </span>
              {isLive && briefs[snapshot] && (
                <button
                  className="cursor-pointer text-indigo-700 underline underline-offset-2"
                  onClick={() => setLive((prev) => ({ ...prev, [snapshot]: undefined }))}
                >
                  Back to precomputed
                </button>
              )}
            </>
          ) : (
            <span>No precomputed brief for this snapshot. Run `npm run extract`, or click Run live.</span>
          )}
          {!isDiff && (
            <span className="ml-auto">
              Brief as of {fmtDate(snap.as_of)} · built from {snap.sources.length} sources
            </span>
          )}
        </div>
      </header>

      {/* Two panes */}
      <main className="grid flex-1 grid-cols-1 lg:min-h-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className={`px-4 py-6 sm:px-6 lg:overflow-y-auto ${running ? "opacity-60" : ""}`}>
          {isDiff ? (
            diff ? (
              <DiffPanel diff={diff} onCite={onCite} active={active} />
            ) : (
              <p className="text-sm text-stone-500">Both briefs are needed to compare. Run `npm run extract`.</p>
            )
          ) : file ? (
            <BriefPanel brief={file.brief} onCite={onCite} active={active} />
          ) : (
            <p className="text-sm text-stone-500">No brief yet.</p>
          )}
          {!isDiff && (
            <footer className="mt-10 border-t border-stone-200 pt-4 text-xs leading-relaxed text-stone-500">
              One Claude call per brief: sources go in as numbered lines, and a Zod schema constrains the output. Every claim
              must cite a line and quote it verbatim, and each quote is checked against the source text after the call.
              Anything the sources don&apos;t state is shown as <em>Not mentioned</em>. Click any citation to see the line it
              came from.
            </footer>
          )}
        </div>
        <div className="border-t border-stone-200 bg-stone-50 px-4 pb-10 sm:px-6 lg:overflow-y-auto lg:border-t-0 lg:border-l">
          <SourcesPanel
            sources={sources}
            includedIds={snap.sources}
            newIds={isDiff ? (diff?.newSourceIds ?? []) : []}
            citedLines={citedLines}
            active={active}
          />
        </div>
      </main>
    </div>
  );
}
