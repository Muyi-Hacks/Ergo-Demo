/**
 * Precompute the sample deal's briefs into data/briefs/<snapshot>.json.
 *
 *   npm run extract                 # both snapshots
 *   npm run extract -- after_call2  # one snapshot
 *
 * Reads ANTHROPIC_API_KEY from the environment or .env.local. The output JSON is
 * committed, so builds and the public demo never call the API.
 */
import fs from "node:fs";
import path from "node:path";
import { generateBrief } from "../lib/extract";
import { FACT_KEYS } from "../lib/schema";
import { DATA_DIR, loadSnapshot, SNAPSHOT_IDS, type SnapshotId } from "../lib/sources";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: fall back to the shell environment.
}

async function main() {
  const args = process.argv.slice(2);
  const bad = args.filter((a) => !SNAPSHOT_IDS.includes(a as SnapshotId));
  if (bad.length) throw new Error(`Unknown snapshot(s): ${bad.join(", ")}. Use: ${SNAPSHOT_IDS.join(", ")}`);
  const ids = (args.length ? args : SNAPSHOT_IDS) as SnapshotId[];

  const outDir = path.join(DATA_DIR, "briefs");
  fs.mkdirSync(outDir, { recursive: true });

  // Snapshots are independent, so run them in parallel.
  const results = await Promise.all(
    ids.map(async (id) => {
      const t0 = Date.now();
      console.log(`→ ${id}: calling model…`);
      const file = await generateBrief(loadSnapshot(id));
      const out = path.join(outDir, `${id}.json`);
      fs.writeFileSync(out, JSON.stringify(file, null, 2) + "\n");
      return { id, file, out, secs: ((Date.now() - t0) / 1000).toFixed(0) };
    }),
  );

  for (const { id, file, out, secs } of results) {
    const c = file.citation_check;
    const b = file.brief;
    console.log(`\n✓ ${id} (${secs}s, ${file.usage.input_tokens} in / ${file.usage.output_tokens} out) → ${path.relative(process.cwd(), out)}`);
    console.log(
      `  ${b.stakeholders.length} stakeholders, ${b.pains.length} pains, ${b.objections.length} objections, ` +
        `${b.next_steps.length} next steps, ${b.risks.length} risks, ${b.crm_discrepancies.length} CRM discrepancies`,
    );
    const missing = FACT_KEYS.filter((k) => !b.facts.some((f) => f.key === k));
    if (missing.length) console.log(`  ⚠ facts missing keys: ${missing.join(", ")}`);
    console.log(`  citations: ${c.verified}/${c.total} verified, ${c.corrected} corrected, ${c.unverified} unverified`);
    for (const u of c.unverified_items) console.log(`    ✗ [${u.line}] "${u.quote}"`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
