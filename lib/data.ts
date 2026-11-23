import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, loadAllSources, loadManifest, SNAPSHOT_IDS } from "./sources";
import type { BriefFile, SnapshotId } from "./types";

/** Precomputed briefs from `npm run extract`. Read at build time. */
export function loadPrecomputedBriefs(): Partial<Record<SnapshotId, BriefFile>> {
  const out: Partial<Record<SnapshotId, BriefFile>> = {};
  for (const id of SNAPSHOT_IDS) {
    const file = path.join(DATA_DIR, "briefs", `${id}.json`);
    if (fs.existsSync(file)) out[id] = JSON.parse(fs.readFileSync(file, "utf8"));
  }
  return out;
}

export function loadPageData() {
  const manifest = loadManifest();
  return {
    deal: manifest.deal,
    snapshots: SNAPSHOT_IDS.map((id) => ({ id, ...manifest.snapshots[id] })),
    sources: loadAllSources(),
    briefs: loadPrecomputedBriefs(),
  };
}

export type PageData = ReturnType<typeof loadPageData>;
