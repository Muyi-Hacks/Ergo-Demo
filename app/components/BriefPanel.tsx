"use client";

import { FACT_LABELS } from "@/lib/facts";
import type { CheckedBrief } from "@/lib/types";
import { type ActiveCitation, CiteChips, isNotMentioned, type OnCite } from "./cite";
import { Empty, Pill, roleStyle, ROLE_LABEL, Section, SEVERITY_STYLE, Value } from "./ui";

type Props = { brief: CheckedBrief; onCite: OnCite; active: ActiveCitation | null };

export function BriefPanel({ brief, onCite, active }: Props) {
  const cite = (citations: Parameters<typeof CiteChips>[0]["citations"]) => (
    <CiteChips citations={citations} onCite={onCite} active={active} />
  );
  const stakeholders = [...brief.stakeholders].sort((a, b) => (a.side === b.side ? 0 : a.side === "buyer" ? -1 : 1));

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-lg bg-stone-900 px-5 py-4 text-[15px] leading-relaxed text-stone-50">
        {brief.summary.text} <span className="[&_button]:border-stone-600 [&_button]:bg-stone-800 [&_button]:text-stone-300">{cite(brief.summary.citations)}</span>
      </div>

      {/* Key facts */}
      <Section title="Key facts">
        <dl className="divide-y divide-stone-100">
          {brief.facts.map((f) => (
            <div key={f.key} className="grid gap-1 py-2.5 sm:grid-cols-[9.5rem_1fr] sm:gap-4">
              <dt className="text-sm font-medium text-stone-500">{FACT_LABELS[f.key] ?? f.key}</dt>
              <dd className="text-sm leading-relaxed text-stone-900">
                {f.status === "not_mentioned" ? <Value text="Not mentioned" /> : <Value text={f.value} />} {cite(f.citations)}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* Stakeholders */}
      <Section title="Stakeholders" count={stakeholders.length}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {stakeholders.map((s) => (
            <div
              key={s.name}
              className={`rounded-lg border p-3.5 ${s.side === "seller" ? "border-dashed border-stone-200 bg-stone-50/60" : "border-stone-200 bg-white"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-stone-900">{s.name}</div>
                  <div className="truncate text-xs text-stone-500">
                    {isNotMentioned(s.title) ? "Title not mentioned" : s.title} · {s.organization}
                  </div>
                </div>
                <Pill className={roleStyle(s.side, s.role)}>
                  {ROLE_LABEL[s.role] ?? s.role}
                </Pill>
              </div>
              {s.side === "buyer" && (
                <p className="mt-2 text-sm leading-snug text-stone-700">
                  <span className="text-stone-400">Stance: </span>
                  <Value text={s.stance} />
                </p>
              )}
              <div className="mt-2">{cite(s.citations)}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Pains */}
      <Section title="Pains" count={brief.pains.length}>
        {brief.pains.length ? (
          <ul className="space-y-2.5">
            {brief.pains.map((p, i) => (
              <li key={i} className="text-sm leading-relaxed text-stone-900">
                {p.text}
                {!isNotMentioned(p.quantified_impact) && (
                  <span className="ml-1.5 rounded bg-stone-100 px-1.5 py-px text-xs font-medium text-stone-700">{p.quantified_impact}</span>
                )}{" "}
                {cite(p.citations)}
              </li>
            ))}
          </ul>
        ) : (
          <Empty />
        )}
      </Section>

      {/* Objections */}
      <Section title="Objections" count={brief.objections.length}>
        {brief.objections.length ? (
          <ul className="space-y-3">
            {brief.objections.map((o, i) => (
              <li key={i} className="text-sm leading-relaxed text-stone-900">
                <div className="mb-1 flex flex-wrap gap-1.5">
                  {o.explicitness === "implied" ? (
                    <Pill className="bg-violet-50 text-violet-700 ring-violet-200">Implied</Pill>
                  ) : (
                    <Pill className="bg-stone-100 text-stone-600 ring-stone-200">Explicit</Pill>
                  )}
                  <Pill
                    className={
                      o.status === "unaddressed"
                        ? "bg-red-50 text-red-700 ring-red-200"
                        : o.status === "resolved"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-amber-50 text-amber-700 ring-amber-200"
                    }
                  >
                    {o.status.replace("_", " ")}
                  </Pill>
                  {!isNotMentioned(o.raised_by) && <span className="text-xs text-stone-500">raised by {o.raised_by}</span>}
                </div>
                {o.text} {cite(o.citations)}
              </li>
            ))}
          </ul>
        ) : (
          <Empty />
        )}
      </Section>

      {/* Next steps */}
      <Section title="Next steps" count={brief.next_steps.length}>
        {brief.next_steps.length ? (
          <ul className="space-y-2.5">
            {brief.next_steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="mt-1.5 size-3 shrink-0 rounded-sm border border-stone-300" />
                <div className="text-stone-900">
                  {s.action} {cite(s.citations)}
                  <div className="text-xs text-stone-500">
                    Owner: <Value text={s.owner} /> · Due: <Value text={s.due} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty />
        )}
      </Section>

      {/* Risks */}
      <Section title="Risks" count={brief.risks.length}>
        {brief.risks.length ? (
          <ul className="space-y-2.5">
            {brief.risks.map((r, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-stone-900">
                <Pill className={`mt-0.5 h-fit w-16 text-center capitalize ${SEVERITY_STYLE[r.severity]}`}>{r.severity}</Pill>
                <div>
                  {r.text} {cite(r.citations)}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty />
        )}
      </Section>

      {/* CRM discrepancies */}
      <Section title="CRM out of date" count={brief.crm_discrepancies.length}>
        {brief.crm_discrepancies.length ? (
          <div className="overflow-x-auto rounded-lg border border-stone-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs text-stone-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Field</th>
                  <th className="px-3 py-2 font-medium">CRM says</th>
                  <th className="px-3 py-2 font-medium">Sources say</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {brief.crm_discrepancies.map((d, i) => (
                  <tr key={i} className="align-top">
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap text-stone-600">{d.field}</td>
                    <td className="px-3 py-2 text-stone-500 line-through decoration-stone-300">{d.crm_value}</td>
                    <td className="px-3 py-2 text-stone-900">
                      {d.sources_value} <div className="mt-1">{cite(d.citations)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-stone-500">CRM matches the conversations.</p>
        )}
      </Section>
    </div>
  );
}
