import Anthropic from "@anthropic-ai/sdk";
import { generateBrief } from "@/lib/extract";
import { loadSnapshot, SNAPSHOT_IDS, type SnapshotId } from "@/lib/sources";

// "Run live": regenerates one snapshot's brief with a real Claude call.
// The API key only exists here on the server; the browser never sees it.

export const runtime = "nodejs";
export const maxDuration = 300; // the model call usually takes 60–90s

// Best-effort abuse guard for a public demo. In-memory, so it's per server
// instance, not global. Pair it with a spend limit on the API key.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = Number(process.env.LIVE_RUNS_PER_HOUR ?? 5);
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "Live runs are disabled on this deployment (no API key configured)." }, { status: 503 });
  }

  let snapshot: SnapshotId;
  try {
    const body = await req.json();
    snapshot = body?.snapshot;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!SNAPSHOT_IDS.includes(snapshot)) {
    return Response.json({ error: `snapshot must be one of: ${SNAPSHOT_IDS.join(", ")}` }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return Response.json({ error: `Live run limit reached (${MAX_PER_WINDOW}/hour). The precomputed brief is still shown.` }, { status: 429 });
  }

  try {
    const file = await generateBrief(loadSnapshot(snapshot));
    return Response.json(file);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Claude API is rate-limited right now. Try again in a minute." }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Anthropic API error", err.status, err.message);
      return Response.json({ error: `Claude API error (${err.status ?? "network"}).` }, { status: 502 });
    }
    console.error(err);
    return Response.json({ error: err instanceof Error ? err.message : "Live run failed." }, { status: 500 });
  }
}
