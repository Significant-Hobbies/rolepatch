const WEAK_VERBS = new Set([
  'did',
  'made',
  'worked',
  'helped',
  'assisted',
  'responsible',
  'involved',
  'participated',
  'tasked',
  'duties',
  'handled',
  'managed', // ambiguous, but flag for review
  'was',
  'were',
  'had',
]);

const STRONG_VERBS = [
  'shipped',
  'led',
  'built',
  'architected',
  'designed',
  'scaled',
  'reduced',
  'increased',
  'automated',
  'drove',
  'delivered',
  'launched',
  'spearheaded',
  'negotiated',
  'owned',
  'migrated',
  'decomposed',
  'rewrote',
  'instrumented',
  'open-sourced',
];

interface Check {
  ok: boolean;
  label: string;
  detail: string;
}

interface BulletReport {
  raw: string;
  checks: Check[];
  score: number;
}

const QUANTIFIER_RE =
  /(\d+(\.\d+)?\s*%|\$\s*\d+|[0-9]+(?:[,.][0-9]+)*\+?|\b(?:million|thousand|k|m|b)\b)/i;
const FIRST_PERSON_RE = /\b(i|me|my|mine)\b/i;
const VERB_TENSE_HINT_RE = /\b(ing)\b/i; // "managing" instead of "managed"

function analyzeBullet(raw: string): BulletReport {
  const text = raw.trim();
  const _lower = text.toLowerCase();
  const firstWord = (text.split(/\s+/)[0] ?? '').replace(/[^a-zA-Z-]/g, '').toLowerCase();

  const checks: Check[] = [];

  const startsWithStrong = STRONG_VERBS.includes(firstWord);
  const startsWithWeak = WEAK_VERBS.has(firstWord);
  checks.push({
    ok: startsWithStrong || !startsWithWeak,
    label: 'Starts with a strong action verb',
    detail: startsWithStrong
      ? `“${firstWord}” is a great opener.`
      : startsWithWeak
        ? `“${firstWord}” is vague — try a verb like ${STRONG_VERBS.slice(0, 4).join(', ')}.`
        : `“${firstWord}” is fine but consider stronger options.`,
  });

  checks.push({
    ok: QUANTIFIER_RE.test(text),
    label: 'Contains a quantified outcome',
    detail: QUANTIFIER_RE.test(text)
      ? 'A measurable number anchors the impact.'
      : 'No numbers / percentages / dollar figures — add a metric if possible.',
  });

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const lenOk = wordCount >= 6 && wordCount <= 24;
  checks.push({
    ok: lenOk,
    label: 'Length within sweet spot (6–24 words)',
    detail: `${wordCount} word${wordCount === 1 ? '' : 's'} — ${
      wordCount < 6 ? 'too short, add context' : wordCount > 24 ? 'too long, trim filler' : 'good'
    }.`,
  });

  const noFirstPerson = !FIRST_PERSON_RE.test(text);
  checks.push({
    ok: noFirstPerson,
    label: 'No first-person pronouns',
    detail: noFirstPerson
      ? "Clean — resume convention drops 'I' / 'my'."
      : "Drop 'I' / 'my' — resume convention is implied first person.",
  });

  const presentParticiple = /\b\w+ing\b/.test(firstWord) || VERB_TENSE_HINT_RE.test(firstWord);
  checks.push({
    ok: !presentParticiple,
    label: 'Uses past tense (or present for current role)',
    detail: presentParticiple
      ? `“${firstWord}” is -ing form — past tense reads stronger.`
      : 'Past tense reads decisive and complete.',
  });

  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);

  // de-duplicate: if no input, all checks fail and score is 0 by design
  if (!text) {
    return { raw, score: 0, checks: [] };
  }

  return { raw, score, checks };
}

const PLACEHOLDER = `Built dashboard for support team
Managed deployment pipeline
Reduced API p99 latency from 410ms to 95ms (-77%) by adding read replicas
I was responsible for handling team standups`;

export { PLACEHOLDER, analyzeBullet };
