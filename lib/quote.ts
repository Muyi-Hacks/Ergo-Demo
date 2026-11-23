/**
 * Locate a model-written quote inside a source line, tolerant of the small
 * differences models introduce (case, curly vs straight quotes, dashes,
 * whitespace, "..." elisions, trimmed punctuation). Returns character offsets in
 * the ORIGINAL line so the UI can highlight exactly that span.
 *
 * Shared by the citation verifier (server) and the highlighter (client), so a
 * highlighted span is always the text that was verified.
 */

const CHAR_MAP: Record<string, string> = {
  "‘": "'",
  "’": "'",
  "“": '"',
  "”": '"',
  "–": "-",
  "—": "-",
};

/** Normalized text plus, for each normalized char, its index in the original. */
function normalizeWithMap(s: string): { text: string; map: number[] } {
  let text = "";
  const map: number[] = [];
  let lastWasSpace = true; // also trims leading whitespace
  for (let i = 0; i < s.length; i++) {
    let ch = s[i];
    if (ch === "…") {
      for (let k = 0; k < 3; k++) {
        text += ".";
        map.push(i);
      }
      lastWasSpace = false;
      continue;
    }
    ch = CHAR_MAP[ch] ?? ch.toLowerCase();
    if (/\s/.test(ch)) {
      if (lastWasSpace) continue;
      ch = " ";
      lastWasSpace = true;
    } else {
      lastWasSpace = false;
    }
    text += ch;
    map.push(i);
  }
  if (text.endsWith(" ")) {
    text = text.slice(0, -1);
    map.pop();
  }
  return { text, map };
}

const EDGE = /^[\s"'.,;:!?\-]+|[\s"'.,;:!?\-]+$/g;

function normalizeQuote(q: string): string {
  return normalizeWithMap(q.replace(/^\s*>\s?/, "")).text.replace(EDGE, "");
}

export interface QuoteRange {
  start: number;
  end: number; // exclusive
}

export function findQuote(line: string, quote: string): QuoteRange | null {
  const q = normalizeQuote(quote);
  if (!q) return null;
  const { text, map } = normalizeWithMap(line);

  const toRange = (s: number, e: number): QuoteRange => ({ start: map[s], end: map[e - 1] + 1 });

  const idx = text.indexOf(q);
  if (idx !== -1) return toRange(idx, idx + q.length);

  // "..." elisions: every fragment must appear, in order. Highlight first→last.
  const parts = q
    .split(/\s*\.\.\.\s*/)
    .map((p) => p.replace(EDGE, ""))
    .filter(Boolean);
  if (parts.length < 2) return null;
  let from = 0;
  let first = -1;
  for (const p of parts) {
    const i = text.indexOf(p, from);
    if (i === -1) return null;
    if (first === -1) first = i;
    from = i + p.length;
  }
  return toRange(first, from);
}
