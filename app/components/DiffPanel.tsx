"use client";

import type { BriefDiff, ListDiff } from "@/lib/diff";
import { FACT_LABELS } from "@/lib/facts";
import type { CheckedCitation } from "@/lib/types";
import type { ReactNode } from "react";
import { type ActiveCitation, CiteChips, isNotMentioned, type OnCite, sourceLabel } from "./cite";
import { Empty, Pill, roleStyle, ROLE_LABEL, Section, SEVERITY_STYLE, Value } from "./ui";

type Props = { diff: BriefDiff; onCite: OnCite; active: ActiveCitation | null };

const TAG = {
  new: <Pill className="bg-emerald-50 text-emerald-700 ring-emerald-200">New</Pill>,
  updated: <Pill className="bg-indigo-50 text-indigo-700 ring-indigo-200">Updated</Pill>,
  changed: <Pill className="bg-indigo-50 text-indigo-700 ring-indigo-200">Changed</Pill>,
};

function Before({ children }: { children: ReactNode }) {
  return (
    <div className="mt-1 border-l-2 border-stone-200 pl-2 text-[13px] leading-snug text-stone-500">
      <span className="text-[11px] font-medium tracking-wide text-stone-400 uppercase">After call 1: </span>
      {children}
    </div>
  );
}

function Collapsed({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="group mt-3 text-sm">
      <summary className="cursor-pointer list-none text-stone-500 select-none hover:text-stone-800">
        <span className="inline-block transition-transform group-open:rotate-90">›</span> {label}
      </summary>
      <div className="mt-2 space-y-2 pl-3">{children}</div>
    </details>
  );
}

/** One list category (objections, risks, ...) rendered as a diff. */
function ListSection<T extends { citations: CheckedCitation[] }>({
  title,
  diff,
  render,
  cite,
}: {
  title: string;
  diff: ListDiff<T>;
  render: (item: T) => ReactNode;
  cite: (c: CheckedCitation[]) => ReactNode;
}) {
  const changes = diff.added.length + diff.updated.length;
  return (
    <Section title={title} count={changes}>
      {changes === 0 && <Empty>No new or updated items.</Empty>}
      <ul className="space-y-3">
        {diff.added.map((item, i) => (
          <li key={`a${i}`} className="text-sm leading-relaxed text-stone-900">
            <div className="mb-0.5">{TAG.new}</div>
            {render(item)} {cite(item.citations)}
          </li>
        ))}
        {diff.updated.map(({ before, after }, i) => (
          <li key={`u${i}`} className="text-sm leading-relaxed text-stone-900">
            <div className="mb-0.5">{TAG.updated}</div>
            {render(after)} {cite(after.citations)}
            {before && <Before>{render(before)}</Before>}
          </li>
        ))}
      </ul>
      {diff.dropped.length > 0 && (
        <Collapsed label={`${diff.dropped.length} from call 1 not carried forward (done, resolved, superseded, or restated above)`}>
          {diff.dropped.map((item, i) => (
            <div key={i} className="text-stone-500">
              {render(item)} {cite(item.citations)}
            </div>
          ))}
        </Collapsed>
      )}
      {diff.unchanged.length > 0 && (
        <Collapsed label={`${diff.unchanged.length} unchanged (no new evidence)`}>
          {diff.unchanged.map(({ after }, i) => (
            <div key={i} className="text-stone-600">
              {render(after)} {cite(after.citations)}
            </div>
          ))}
        </Collapsed>
      )}
    </Section>
  );
}

export function DiffPanel({ diff, onCite, active }: Props) {
  const newSources = new Set(diff.newSourceIds);
  const cite = (citations: CheckedCitation[]) => (
    <CiteChips citations={citations} onCite={onCite} active={active} emphasizeSources={newSources} />
  );
  const { before, after } = diff;
  // The changes a rep cares about most go first.
  const PRIORITY = ["budget", "target_go_live", "decision_process", "signature_deadline", "competition", "pricing", "stage"];
  const changedFacts = diff.facts.filter((f) => f.changed).sort((x, y) => PRIORITY.indexOf(x.key) - PRIORITY.indexOf(y.key));
  const sameFacts = diff.facts.filter((f) => !f.changed);
  const st = diff.stakeholders;

  const headline = [
    changedFacts.length && `${changedFacts.length} key facts changed`,
    st.added.length && `${st.added.length} new stakeholder${st.added.length > 1 ? "s" : ""}`,
    diff.objections.added.length && `${diff.objections.added.length} new objections`,
    diff.risks.added.length && `${diff.risks.added.length} new risks`,
    diff.crm.added.length && `${diff.crm.added.length} CRM fields now stale`,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Then / now */}
      <div className="overflow-hidden rounded-lg border border-stone-200">
        <div className="grid sm:grid-cols-2">
          <div className="bg-stone-50 px-4 py-3.5">
            <div className="mb-1 text-[11px] font-semibold tracking-wide text-stone-400 uppercase">Then · {before.label}</div>
            <p className="text-sm leading-relaxed text-stone-600">
              {before.brief.summary.text} {cite(before.brief.summary.citations)}
            </p>
          </div>
          <div className="border-t border-stone-200 bg-stone-900 px-4 py-3.5 sm:border-t-0 sm:border-l">
            <div className="mb-1 text-[11px] font-semibold tracking-wide text-stone-400 uppercase">Now · {after.label}</div>
            <p className="text-sm leading-relaxed text-stone-50 [&_button]:border-stone-600 [&_button]:bg-stone-800 [&_button]:text-stone-300">
              {after.brief.summary.text} {cite(after.brief.summary.citations)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-stone-200 bg-white px-4 py-2.5 text-xs text-stone-600">
          <span className="text-stone-400">New since call 1:</span>
          {diff.newSourceIds.map((id) => (
            <span key={id} className="rounded bg-indigo-50 px-1.5 py-px font-medium text-indigo-700">
              {sourceLabel(id)}
            </span>
          ))}
          {headline.length > 0 && <span className="text-stone-300">|</span>}
          <span>{headline.join(" · ")}</span>
        </div>
      </div>

      {/* Stakeholders */}
      <Section title="Stakeholders" count={st.added.length + st.changed.length + st.removed.length}>
        <ul className="space-y-3">
          {st.added.map((s) => (
            <li key={s.name} className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                {TAG.new}
                <span className="font-semibold text-stone-900">{s.name}</span>
                <Pill className={roleStyle(s.side, s.role)}>{ROLE_LABEL[s.role] ?? s.role}</Pill>
              </div>
              <div className="mt-1 text-xs text-stone-500">
                {isNotMentioned(s.title) ? "Title not mentioned" : s.title} · {s.organization}
              </div>
              <p className="mt-1.5 text-sm text-stone-700">{s.role_evidence}</p>
              {s.side === "buyer" && (
                <p className="mt-1 text-sm text-stone-700">
                  <span className="text-stone-400">Stance: </span>
                  <Value text={s.stance} />
                </p>
              )}
              <div className="mt-2">{cite(s.citations)}</div>
            </li>
          ))}
          {st.changed.map(({ before: b, after: a, roleChanged }) => (
            <li key={a.name} className="text-sm leading-relaxed text-stone-900">
              <div className="mb-0.5 flex flex-wrap items-center gap-2">
                {TAG.updated}
                <span className="font-semibold">{a.name}</span>
                {roleChanged ? (
                  <span className="text-xs text-stone-500">
                    {ROLE_LABEL[b.role]} → <span className="font-medium text-stone-800">{ROLE_LABEL[a.role]}</span>
                  </span>
                ) : (
                  <span className="text-xs text-stone-500">{ROLE_LABEL[a.role]}</span>
                )}
              </div>
              <span className="text-stone-400">Stance: </span>
              <Value text={a.stance} /> {cite(a.citations)}
              <Before>
                <Value text={b.stance} />
              </Before>
            </li>
          ))}
          {st.removed.map((s) => (
            <li key={s.name} className="text-sm text-stone-500">
              <span className="font-medium">{s.name}</span> is no longer listed.
            </li>
          ))}
        </ul>
        {st.unchanged.length > 0 && (
          <p className="mt-3 text-sm text-stone-500">
            Unchanged: {st.unchanged.map((s) => s.name).join(", ")}.
          </p>
        )}
      </Section>

      {/* Facts */}
      <Section title="Key facts" count={changedFacts.length}>
        <div className="divide-y divide-stone-100">
          {changedFacts.map(({ key, before: b, after: a }) => (
            <div key={key} className="grid gap-1 py-3 sm:grid-cols-[9.5rem_1fr] sm:gap-4">
              <div className="text-sm font-medium text-stone-500">{FACT_LABELS[key]}</div>
              <div className="text-sm leading-relaxed text-stone-900">
                {a && a.status !== "not_mentioned" ? <Value text={a.value} /> : <Value text="Not mentioned" />}{" "}
                {a && cite(a.citations)}
                {b && (
                  <Before>
                    {b.status !== "not_mentioned" ? <Value text={b.value} /> : <Value text="Not mentioned" />}
                  </Before>
                )}
              </div>
            </div>
          ))}
        </div>
        {sameFacts.length > 0 && (
          <p className="mt-2 text-sm text-stone-500">Unchanged: {sameFacts.map((f) => FACT_LABELS[f.key]).join(", ")}.</p>
        )}
      </Section>

      <ListSection
        title="Objections"
        diff={diff.objections}
        cite={cite}
        render={(o) => (
          <>
            {o.explicitness === "implied" && <span className="mr-1 text-xs font-medium text-violet-700">[implied]</span>}
            {o.text}
          </>
        )}
      />

      <ListSection
        title="Risks"
        diff={diff.risks}
        cite={cite}
        render={(r) => (
          <>
            <Pill className={`mr-1.5 capitalize ${SEVERITY_STYLE[r.severity]}`}>{r.severity}</Pill>
            {r.text}
          </>
        )}
      />

      <ListSection
        title="Next steps"
        diff={diff.next_steps}
        cite={cite}
        render={(s) => (
          <>
            {s.action}
            <span className="text-xs text-stone-500">
              {" "}
              (Owner: <Value text={s.owner} /> · Due: <Value text={s.due} />)
            </span>
          </>
        )}
      />

      <ListSection title="Pains" diff={diff.pains} cite={cite} render={(p) => <>{p.text}</>} />

      {/* CRM */}
      <Section title="CRM now out of date" count={diff.crm.added.length}>
        {diff.crm.added.length ? (
          <ul className="space-y-2.5">
            {diff.crm.added.map((d, i) => (
              <li key={i} className="text-sm leading-relaxed text-stone-900">
                <span className="font-mono text-xs text-stone-600">{d.field}</span>
                <span className="mx-1.5 text-stone-400 line-through decoration-stone-300">{d.crm_value}</span>→ {d.sources_value}{" "}
                {cite(d.citations)}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No new CRM discrepancies.</Empty>
        )}
      </Section>

      <p className="border-t border-stone-200 pt-4 text-xs leading-relaxed text-stone-500">
        This comparison is computed, not generated: each item is classed by where its citations come from. <b>New</b> cites only sources
        that arrived after call 1 (highlighted chips). <b>Updated</b> mixes old and new evidence. Items that cite nothing new count as
        unchanged.
      </p>
    </div>
  );
}
