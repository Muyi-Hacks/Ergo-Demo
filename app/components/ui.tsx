import type { ReactNode } from "react";
import { isNotMentioned } from "./cite";

export const ROLE_LABEL: Record<string, string> = {
  champion: "Champion",
  economic_buyer: "Economic buyer",
  technical_evaluator: "Technical evaluator",
  security_approver: "Security approver",
  procurement: "Procurement",
  influencer: "Influencer",
  seller_team: "Seller team",
  other: "Other",
};

export const SEVERITY_STYLE: Record<string, string> = {
  high: "bg-red-100 text-red-800 ring-red-200",
  medium: "bg-amber-100 text-amber-800 ring-amber-200",
  low: "bg-stone-100 text-stone-600 ring-stone-200",
};

export function roleStyle(side: string, role: string): string {
  if (side === "seller") return "bg-stone-100 text-stone-500 ring-stone-200";
  if (role === "champion") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (role === "economic_buyer") return "bg-indigo-50 text-indigo-700 ring-indigo-200";
  return "bg-sky-50 text-sky-700 ring-sky-200";
}

export function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="border-t border-stone-200 pt-5">
      <h2 className="mb-3 flex items-baseline gap-2 text-[13px] font-semibold tracking-wide text-stone-500 uppercase">
        {title}
        {count !== undefined && <span className="font-normal text-stone-400">{count}</span>}
      </h2>
      {children}
    </section>
  );
}

export function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-px text-[11px] font-medium whitespace-nowrap ring-1 ring-inset ${className}`}>
      {children}
    </span>
  );
}

export function Value({ text }: { text: string }) {
  return isNotMentioned(text) ? <span className="text-stone-400 italic">Not mentioned</span> : <>{text}</>;
}

export function Empty({ children = "None in the sources." }: { children?: ReactNode }) {
  return <p className="text-sm text-stone-400 italic">{children}</p>;
}
