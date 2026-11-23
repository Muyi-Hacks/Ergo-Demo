import fs from "node:fs";
import path from "node:path";

export type SourceKind = "crm" | "transcript" | "email";
export type SnapshotId = "after_call1" | "after_call2";
export const SNAPSHOT_IDS: SnapshotId[] = ["after_call1", "after_call2"];

export interface SourceLine {
  /** Citation ID, e.g. "call1-L48". */
  id: string;
  /** 1-based line number within the file. */
  n: number;
  text: string;
}

export interface Source {
  id: string;
  file: string;
  kind: SourceKind;
  title: string;
  date: string;
  lines: SourceLine[];
}

interface ManifestSource {
  id: string;
  file: string;
  kind: SourceKind;
  title: string;
  date: string;
}

interface ManifestSnapshot {
  label: string;
  as_of: string;
  sources: string[];
}

export interface Manifest {
  deal: { id: string; seller: string; buyer: string; product: string };
  sources: ManifestSource[];
  snapshots: Record<SnapshotId, ManifestSnapshot>;
}

export interface Snapshot extends Omit<ManifestSnapshot, "sources"> {
  id: SnapshotId;
  deal: Manifest["deal"];
  sources: Source[];
}

export const DATA_DIR = path.join(process.cwd(), "data");

export function lineId(sourceId: string, n: number): string {
  return `${sourceId}-L${n}`;
}

export function loadManifest(): Manifest {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, "manifest.json"), "utf8"));
}

function loadSource(meta: ManifestSource): Source {
  const raw = fs.readFileSync(path.join(DATA_DIR, meta.file), "utf8");
  const text = raw.endsWith("\n") ? raw.slice(0, -1) : raw;
  const lines = text.split("\n").map((t, i) => ({ id: lineId(meta.id, i + 1), n: i + 1, text: t }));
  return { ...meta, lines };
}

/** Every source in the deal, numbered, in manifest (chronological) order. */
export function loadAllSources(): Source[] {
  return loadManifest().sources.map(loadSource);
}

export function loadSnapshot(id: SnapshotId): Snapshot {
  const manifest = loadManifest();
  const snap = manifest.snapshots[id];
  if (!snap) throw new Error(`Unknown snapshot: ${id}`);
  const sources = manifest.sources.filter((s) => snap.sources.includes(s.id)).map(loadSource);
  return { ...snap, id, deal: manifest.deal, sources };
}

/**
 * Render sources for the prompt. Every non-blank line is prefixed with its
 * citation ID; blank lines are skipped but keep their numbers so IDs match the UI.
 */
export function formatSourcesForPrompt(sources: Source[]): string {
  return sources
    .map((s) => {
      const body = s.lines
        .filter((l) => l.text.trim() !== "")
        .map((l) => `[${l.id}] ${l.text}`)
        .join("\n");
      return `<source id="${s.id}" kind="${s.kind}" title="${s.title}" date="${s.date}">\n${body}\n</source>`;
    })
    .join("\n\n");
}
