// Types shared by server and client. Type-only imports, so the client bundle
// never pulls in the SDK or node:fs.
import type { DealBrief } from "./schema";
import type { SnapshotId } from "./sources";
import type { CitationReport, WithCheckedCitations } from "./verify";

export type CheckedBrief = WithCheckedCitations<DealBrief>;

export interface BriefFile {
  snapshot: SnapshotId;
  label: string;
  as_of: string;
  source_ids: string[];
  model: string;
  generated_at: string;
  usage: { input_tokens: number; output_tokens: number };
  citation_check: CitationReport;
  brief: CheckedBrief;
}

export type { SnapshotId, Source, SourceLine, SourceKind } from "./sources";
export type { CheckedCitation, CitationStatus } from "./verify";
