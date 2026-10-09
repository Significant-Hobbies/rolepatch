/**
 * Deterministic lexical grounding for the generated resume summary (#11).
 *
 * Every substantive word of a summary sentence must occur in the source resume
 * evidence. A sentence that names an employer or project may only use words
 * from that employer's or project's own evidence, so claims cannot migrate
 * between roles. This is a bounded check, not semantic entailment: it blocks
 * vocabulary the source never used (for example "ledger" or "accounting" taken
 * from a job description) and cross-role attribution, not every paraphrase.
 */

export interface GroundingEvidence {
  context: string;
  text: string;
}

/** Framing vocabulary that describes the candidate without asserting a new fact. */
const FRAMING = new Set(
  `a about across all also an and any applied applying apply are as at background based be been being bring brings
  build building builds built by can career client clients combine combining contribute contributed contributing core create created customer customers
  creating creates daily deep deliver delivered delivering delivers design designed designing designs develop developed
  developer developers developing development develops drive driven driving each effective efficient end engineer
  engineered engineering engineers ensure ensuring especially experience experienced expertise extensive facing
  feature features focus focused focusing for from full grounded hands has have having help helped helping high
  impact impactful implement implemented implementing in including into is it its known modern more most multiple
  of on ongoing or other over own practical product production products professional proficient projects proven
  quality real recent record reliable robust role roles scalable seasoned senior several shipped shipping ships
  skill skilled skills software solid solutions specialist specializing stack strong such systems technical that the
  their them these this those through to tool tools track user users using various well while who whose with work
  worked working works world years`.split(/\s+/)
);

/** Common resume abbreviations that name the same evidence. */
const SYNONYMS: Record<string, string[]> = {
  ui: ['interface', 'interfaces', 'frontend'],
  ux: ['experience'],
  frontend: ['ui', 'interface', 'interfaces', 'client'],
  backend: ['server', 'service', 'services'],
  api: ['apis', 'endpoint', 'endpoints'],
  apis: ['api', 'endpoint', 'endpoints'],
  llm: ['language', 'model', 'models', 'llms'],
  llms: ['language', 'model', 'models', 'llm'],
  ml: ['machine', 'learning'],
  ai: ['artificial', 'intelligence'],
  react: ['frontend', 'ui', 'interface', 'interfaces'],
  html: ['frontend', 'web'],
  css: ['frontend', 'styling'],
  swiftui: ['frontend', 'ui', 'interface', 'interfaces'],
  screens: ['ui', 'interface', 'interfaces'],
  rag: ['retrieval', 'augmented', 'generation'],
};

const FRAMING_STEMS = new Set([...FRAMING].map((word) => stem(word)));

const GENERIC_HEADING_WORDS = new Set(
  `experience employment work history projects project products product selected education summary profile senior
  staff principal lead junior software engineer engineering developer intern founder present remote full time part
  contract freelance company inc llc ltd`.split(/\s+/)
);

function words(text: string): string[] {
  return (
    text
      .normalize('NFKC')
      .replace(/[‘’]/g, "'")
      .match(/[\p{L}\p{N}]+(?:[.+#'][\p{L}\p{N}+#]+)*[+#]*/gu) ?? []
  ).map((word) => word.replace(/'s$/i, ''));
}

/** Light suffix folding so "shipped"/"shipping" or "reconcile"/"reconciliation" match. */
function stem(word: string): string {
  let value = word.toLowerCase();
  if (/[.+#]/.test(value) || value.length < 5) return value;
  value = value.replace(/ies$|ied$/, 'y');
  for (const suffix of [
    'izations',
    'ization',
    'ations',
    'ation',
    'ments',
    'ment',
    'ings',
    'ing',
    'ated',
    'ates',
    'ate',
    'ed',
    'es',
    's',
    'ly',
  ])
    if (value.endsWith(suffix) && value.length - suffix.length >= 3) {
      value = value.slice(0, -suffix.length);
      break;
    }
  return value.replace(/([a-z])\1$/, '$1').replace(/[eiy]$/, '');
}

function matches(term: string, pool: Set<string>): boolean {
  if (pool.has(term)) return true;
  // Tolerate one trailing character of stem drift ("eval"/"evalu"), not prefixes.
  for (const known of pool)
    if (
      Math.min(known.length, term.length) >= 4 &&
      Math.abs(known.length - term.length) === 1 &&
      (known.startsWith(term) || term.startsWith(known))
    )
      return true;
  return false;
}

function vocabulary(texts: string[]): Set<string> {
  const pool = new Set<string>();
  for (const word of texts.flatMap(words)) {
    const lower = word.toLowerCase();
    for (const value of [lower, ...lower.split(/[.+#']/), ...(SYNONYMS[lower] ?? [])])
      if (value) pool.add(stem(value));
  }
  return pool;
}

/** Case-sensitive employer/project names from evidence headings, e.g. "Front.Page". */
function entityNames(context: string): string[] {
  const [section, ...headings] = context.split(' / ');
  if (!/\b(experience|employment|work|projects?|products?)\b/i.test(section)) return [];
  // "Company | Title", "Company — Title", "Title at Company": the first named segment wins.
  for (const segment of headings.join(' / ').split(/\s+(?:[|\u2014\u2013-]|at|@)\s+|,\s*/)) {
    const names = words(segment).filter(
      (word) =>
        word.length >= 3 &&
        /[\p{Lu}.]/u.test(word) &&
        !GENERIC_HEADING_WORDS.has(word.toLowerCase())
    );
    if (names.length) return names;
  }
  return [];
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[\p{Lu}\p{N}"'(])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export interface ClaimGrounding {
  /** Words in one sentence that its source evidence never states. */
  unsupportedTerms(sentence: string): string[];
  /** Bounded repair: keep only grounded sentences and report the removed ones. */
  repair(text: string): { text: string; removed: string[] };
}

function isUnsupported(word: string, pool: Set<string>): boolean {
  const lower = word.toLowerCase();
  if (/\d/.test(lower) || lower.length < 2 || FRAMING.has(lower)) return false;
  const parts = [lower, ...lower.split(/[.']/).filter((part) => part.length > 1)];
  return !parts.some(
    (part) => FRAMING.has(part) || FRAMING_STEMS.has(stem(part)) || matches(stem(part), pool)
  );
}

export function createClaimGrounding(evidence: GroundingEvidence[]): ClaimGrounding {
  const factText = (facts: GroundingEvidence[]) => facts.flatMap((f) => [f.context, f.text]);
  const all = vocabulary(factText(evidence));
  const entities = new Map<string, GroundingEvidence[]>();
  for (const fact of evidence)
    for (const name of entityNames(fact.context))
      entities.set(name, [...(entities.get(name) ?? []), fact]);
  const verbatim = new Set(evidence.map((fact) => fact.text.replace(/[.!?]$/, '')));
  const unsupportedTerms = (sentence: string) => {
    // A complete source fact quoted verbatim (the extractive fallback) is grounded by definition.
    if (verbatim.has(sentence.replace(/[.!?]$/, ''))) return [];
    const sentenceWords = words(sentence);
    const named = [...entities.keys()].filter((name) => sentenceWords.includes(name));
    // A sentence naming an employer/project may only use that entity's own evidence.
    const pool = named.length
      ? vocabulary(factText(named.flatMap((name) => entities.get(name) ?? [])))
      : all;
    return [...new Set(sentenceWords.filter((word) => isUnsupported(word, pool)))];
  };
  return {
    unsupportedTerms,
    repair(text) {
      // Structural injection (headings, links, markup, line breaks) is never repaired: it must
      // reach validation intact and fail closed.
      if (/[\r\n<>`[\]*#]/.test(text)) return { text, removed: [] };
      const kept: string[] = [];
      const removed: string[] = [];
      for (const sentence of splitSentences(text))
        (unsupportedTerms(sentence).length ? removed : kept).push(sentence);
      return { text: kept.join(' '), removed };
    },
  };
}
