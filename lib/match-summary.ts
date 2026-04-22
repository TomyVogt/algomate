import { analyzeBio, toLowerClean } from "./friendship-cues";
import { extractConcreteTopics, jaccardList } from "./topic-extract";
import { extractTopicPreferences, TopicPreference } from "./preference-extract";
import { clampSummaryToWords, exactChars } from "./summary";

type BuildSummaryArgs = {
  bioA: string;
  bioB: string;
  distanceKm: number | null | undefined;
  nameA?: string | null;
  nameB?: string | null;
  topicsA?: string[] | null;
  topicsB?: string[] | null;
};

function normalizeSpaces(s: string): string {
  return (s || "").replace(/\s+/g, " ").trim();
}

function safeLower(s: string): string {
  return toLowerClean(String(s || ""));
}

function oxfordJoin(items: string[]): string {
  const xs = (items || []).filter(Boolean);
  if (!xs.length) return "";
  if (xs.length === 1) return xs[0];
  if (xs.length === 2) return xs[0] + " and " + xs[1];
  return xs.slice(0, xs.length - 1).join(", ") + ", and " + xs[xs.length - 1];
}

function buildNameBlacklist(nameA?: string | null, nameB?: string | null): Record<string, true> {
  const out: Record<string, true> = Object.create(null);

  const addName = (n?: string | null) => {
    if (!n) return;
    const parts = toLowerClean(n)
      .split(/\s+/)
      .filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p && p.length >= 2) out[p] = true;
    }
  };

  addName(nameA || null);
  addName(nameB || null);
  return out;
}

function filterBlacklist(items: string[], blacklist: Record<string, true>): string[] {
  const out: string[] = [];
  for (let i = 0; i < (items || []).length; i++) {
    const x = String(items[i] || "").trim();
    if (!x) continue;

    if (x.indexOf(" ") === -1 && blacklist[x]) continue;

    if (x.indexOf(" ") !== -1) {
      const parts = x.split(/\s+/).filter(Boolean);
      let blocked = false;
      for (let j = 0; j < parts.length; j++) {
        if (blacklist[parts[j]]) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;
    }

    if (out.indexOf(x) !== -1) continue;
    out.push(x);
  }
  return out;
}

function pickFromList(items: string[], max: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < (items || []).length; i++) {
    const x = String(items[i] || "").trim();
    if (!x) continue;
    if (out.indexOf(x) !== -1) continue;
    out.push(x);
    if (out.length >= max) break;
  }
  return out;
}

function topicsFromPrefs(prefs: TopicPreference[], minScore: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < (prefs || []).length; i++) {
    const p = prefs[i];
    if (!p) continue;
    if (p.score >= minScore) out.push(p.topic);
  }
  return out;
}

function topicsFromNegPrefs(prefs: TopicPreference[], maxScore: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < (prefs || []).length; i++) {
    const p = prefs[i];
    if (!p) continue;
    if (p.score <= maxScore) out.push(p.topic);
  }
  return out;
}

const SYNONYMS: Record<string, string> = Object.create(null);
(function initSynonyms() {
  SYNONYMS["night life"] = "nightlife";
  SYNONYMS["club"] = "clubbing";
  SYNONYMS["clubs"] = "clubbing";
  SYNONYMS["coffee shop"] = "cafe";
  SYNONYMS["cafés"] = "cafe";
  SYNONYMS["cafes"] = "cafe";
  SYNONYMS["tea lover"] = "tea";
  SYNONYMS["films"] = "movies";
  SYNONYMS["film"] = "movies";
  SYNONYMS["tv shows"] = "tv";
  SYNONYMS["series"] = "tv";
  SYNONYMS["work out"] = "workout";
  SYNONYMS["workouts"] = "workout";
  SYNONYMS["gym"] = "workout";
  SYNONYMS["board game"] = "boardgames";
  SYNONYMS["board games"] = "boardgames";
  SYNONYMS["video game"] = "gaming";
  SYNONYMS["video games"] = "gaming";
  SYNONYMS["techno"] = "electronic music";
  SYNONYMS["house music"] = "electronic music";
  SYNONYMS["edm"] = "electronic music";
})();

function canonicalizeTopic(topic: string): string {
  const t = normalizeSpaces(safeLower(topic));
  if (!t) return "";
  if (SYNONYMS[t]) return SYNONYMS[t];
  if (t.indexOf(" ") === -1 && t.length > 4 && t.charAt(t.length - 1) === "s") {
    const maybe = t.slice(0, t.length - 1);
    if (SYNONYMS[maybe]) return SYNONYMS[maybe];
  }
  return t;
}

function buildCanonicalIndex(topics: string[]): Record<string, string> {
  const idx: Record<string, string> = Object.create(null);
  for (let i = 0; i < (topics || []).length; i++) {
    const display = String(topics[i] || "").trim();
    if (!display) continue;
    const canon = canonicalizeTopic(display);
    if (!canon) continue;
    if (!idx[canon]) idx[canon] = display;
  }
  return idx;
}

function intersectCanonical(aIdx: Record<string, string>, bIdx: Record<string, string>, max: number): string[] {
  const out: string[] = [];
  for (const k in aIdx) {
    if (!bIdx[k]) continue;
    const aDisp = aIdx[k];
    const bDisp = bIdx[k];
    const disp = aDisp.length <= bDisp.length ? aDisp : bDisp;
    if (out.indexOf(disp) === -1) out.push(disp);
    if (out.length >= max) break;
  }
  return out;
}

function onlyCanonical(aIdx: Record<string, string>, bIdx: Record<string, string>, max: number): string[] {
  const out: string[] = [];
  for (const k in aIdx) {
    if (bIdx[k]) continue;
    const disp = aIdx[k];
    if (out.indexOf(disp) === -1) out.push(disp);
    if (out.length >= max) break;
  }
  return out;
}

type AdultTopic = { canon: string; display: string };

const ADULT_TOPICS: { canon: string; display: string; keywords: string[] }[] = [
  { canon: "adult-general", display: "18+", keywords: ["18+", "+18", "nsfw", "adult only", "adults only", "adult content", "spicy", "spicy chats", "spicy talk", "kinky", "kink", "sex positive", "sex-positive", "sexpositive", "open minded in bed", "open-minded in bed"] },
  { canon: "poly/open", display: "open / poly", keywords: ["poly", "polyamory", "polyamorous", "open relationship", "open to open", "open minded relationship", "open-minded relationship", "nonmonogamy", "non-monogamy", "ethical nonmonogamy", "ethical non-monogamy", "enm", "cnm", "consensual nonmonogamy", "consensual non-monogamy", "swinger", "swingers", "swinging", "swing lifestyle"] },
  { canon: "bdsm", display: "BDSM", keywords: ["bdsm", "kink community", "kink scene", "fetlife", "fet life", "kink events", "play party", "dungeon", "munch"] },
  { canon: "consent", display: "consent & boundaries", keywords: ["consent", "consensual", "boundaries", "boundary", "safeword", "safe word", "safe-word", "ssc", "r.a.c.k", "rack", "prick", "aftercare", "check in", "check-in", "negotiation", "negotiate"] },
  { canon: "dom/sub", display: "D/s", keywords: ["dom", "dominant", "domme", "top", "sub", "submissive", "bottom", "d/s", "ds dynamic", "dominance", "submission", "power exchange", "power dynamic", "service submissive", "service sub", "brat", "bratty", "brat tamer", "brattamer", "daddy dom", "mommy dom", "master", "mistress", "sir", "ma'am"] },
  { canon: "switch", display: "switch", keywords: ["switch", "vers", "versatile", "switchy", "flip", "verse"] },
  { canon: "bondage", display: "bondage / rope", keywords: ["bondage", "rope", "ropes", "ropework", "rope work", "shibari", "kinbaku", "restraint", "restraints", "cuffs", "handcuffs", "ties", "tying", "harness", "collar", "collared"] },
  { canon: "impact", display: "impact play", keywords: ["impact", "impact play", "spanking", "paddles", "paddle", "whip", "whips", "flogger", "flogging", "cane", "caning"] },
  { canon: "sensation", display: "sensation play", keywords: ["sensation", "sensation play", "wax", "candle wax", "temperature play", "ice play", "blindfold", "blindfolds", "tease", "teasing"] },
  { canon: "roleplay", display: "roleplay", keywords: ["roleplay", "role play", "rp", "scenario", "fantasy roleplay"] },
  { canon: "fetish", display: "fetishes", keywords: ["fetish", "fetishes", "kink list", "kinks", "fetish friendly", "fetish-friendly"] },
  { canon: "toys", display: "toys", keywords: ["toys", "toy", "toy-friendly", "toy friendly", "sex toys", "adult toys", "vibrator", "vibrators"] },
  { canon: "exhibition", display: "exhibitionism", keywords: ["exhibitionist", "exhibitionism", "voyeur", "voyeurism", "public play", "semi public", "semi-public"] },
  { canon: "casual", display: "casual / hookup", keywords: ["hookup", "hook up", "casual", "casual fun", "fwb", "friends with benefits", "ons", "one night stand"] },
  { canon: "sex", display: "sex", keywords: ["sex", "sexual", "sex life", "sexlife", "sex talk", "sexuality", "libido"] },
  { canon: "adult-platforms", display: "adult platforms", keywords: ["onlyfans", "only fans", "fansly", "manyvids", "many vids", "chaturbate", "camgirl", "cam boy", "camming"] },
];

function normalizeForPhraseSearch(s: string): string {
  return normalizeSpaces(
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s+]/g, " ")
  );
}

function containsKeyword(bioNorm: string, kw: string): boolean {
  const k = normalizeForPhraseSearch(kw);
  if (!k) return false;
  const esc = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp("(^|\\s)" + esc + "(\\s|$)");
  return re.test(bioNorm);
}

function extractAdultTopics(bio: string): AdultTopic[] {
  const bioNorm = normalizeForPhraseSearch(bio);
  const out: AdultTopic[] = [];
  const seen: Record<string, true> = Object.create(null);

  for (let i = 0; i < ADULT_TOPICS.length; i++) {
    const t = ADULT_TOPICS[i];
    let hit = false;
    for (let j = 0; j < t.keywords.length; j++) {
      if (containsKeyword(bioNorm, t.keywords[j])) {
        hit = true;
        break;
      }
    }
    if (hit && !seen[t.canon]) {
      seen[t.canon] = true;
      out.push({ canon: t.canon, display: t.display });
    }
  }

  const specific: AdultTopic[] = [];
  for (let i = 0; i < out.length; i++) {
    if (out[i].canon !== "adult-general") specific.push(out[i]);
  }
  if (!specific.length) return [];

  const HIGH_SPEC: Record<string, true> = Object.create(null);
  HIGH_SPEC["poly/open"] = true;
  HIGH_SPEC["bdsm"] = true;
  HIGH_SPEC["consent"] = true;
  HIGH_SPEC["dom/sub"] = true;
  HIGH_SPEC["switch"] = true;
  HIGH_SPEC["bondage"] = true;
  HIGH_SPEC["impact"] = true;
  HIGH_SPEC["sensation"] = true;
  HIGH_SPEC["roleplay"] = true;
  HIGH_SPEC["fetish"] = true;
  HIGH_SPEC["toys"] = true;
  HIGH_SPEC["exhibition"] = true;
  HIGH_SPEC["adult-platforms"] = true;

  let highSpecificCount = 0;
  for (let i = 0; i < specific.length; i++) {
    if (HIGH_SPEC[specific[i].canon]) highSpecificCount += 1;
  }

  if (highSpecificCount < 1 && specific.length < 2) return [];

  return specific.slice(0, 6);
}

function adultOverlapLine(a: AdultTopic[], b: AdultTopic[]): { line: string; isContrast: boolean } {
  if (!a.length || !b.length) return { line: "", isContrast: false };

  const aMap: Record<string, true> = Object.create(null);
  const bMap: Record<string, true> = Object.create(null);
  for (let i = 0; i < a.length; i++) aMap[a[i].canon] = true;
  for (let i = 0; i < b.length; i++) bMap[b[i].canon] = true;

  const shared: string[] = [];
  const aOnly: string[] = [];
  const bOnly: string[] = [];

  for (let i = 0; i < a.length; i++) {
    const t = a[i];
    if (bMap[t.canon]) {
      if (shared.indexOf(t.display) === -1) shared.push(t.display);
    } else {
      if (aOnly.indexOf(t.display) === -1) aOnly.push(t.display);
    }
  }
  for (let i = 0; i < b.length; i++) {
    const t = b[i];
    if (!aMap[t.canon]) {
      if (bOnly.indexOf(t.display) === -1) bOnly.push(t.display);
    }
  }

  if (shared.length) return { line: "18+: overlap on " + oxfordJoin(shared.slice(0, 2)), isContrast: false };

  const aDisp = aOnly.length ? aOnly[0] : a[0].display;
  const bDisp = bOnly.length ? bOnly[0] : b[0].display;
  return { line: "18+: you mention " + aDisp + "; them " + bDisp, isContrast: true };
}

type Polarity = "pos" | "neg" | "neu";

function clampInt(n: number, min: number, max: number): number {
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function scorePolarity(score: number): Polarity {
  if (score > 0) return "pos";
  if (score < 0) return "neg";
  return "neu";
}

function intensityLabel(score: number): string {
  const s = clampInt(score, -2, 2);
  if (s === 2) return "love";
  if (s === 1) return "like";
  if (s === -1) return "avoid";
  if (s === -2) return "hate";
  return "mention";
}

function intensityMarker(score: number): string {
  const s = clampInt(score, -2, 2);
  if (s === 2) return "++";
  if (s === 1) return "+";
  if (s === -1) return "-";
  if (s === -2) return "--";
  return "";
}

function preferencePhrase(subject: "you" | "they", score: number, topic: string): string {
  const verb = intensityLabel(score);
  const mark = intensityMarker(score);
  return subject + " " + verb + " " + topic + (mark ? " (" + mark + ")" : "");
}

type PrefWithMeta = TopicPreference & { confidence: number; canon: string };

function preferenceConfidence(bioLower: string, topic: string): number {
  const t = normalizeSpaces(safeLower(topic));
  if (!t) return 0;

  const idx = bioLower.indexOf(t);
  if (idx === -1) return 0;

  const start = idx - 40 < 0 ? 0 : idx - 40;
  const end = idx + t.length + 40 > bioLower.length ? bioLower.length : idx + t.length + 40;
  const window = bioLower.slice(start, end);

  const strongPos = /\b(love|obsessed|addicted|passionate|fanatic|die\s*hard)\b/.test(window);
  const strongNeg = /\b(hate|can'?t\s*stand|cannot\s*stand|despise)\b/.test(window);
  const mildPos = /\b(like|enjoy|into|keen|prefer)\b/.test(window);
  const mildNeg = /\b(avoid|not\s*into|don'?t\s*like|do\s*not\s*like|no\s+|without)\b/.test(window);

  if (strongPos || strongNeg) return 2;
  if (mildPos || mildNeg) return 1;
  return 0;
}

function escapeRegExp(s: string): string {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyNegationScopeBoost(bioLower: string, prefs: TopicPreference[]): TopicPreference[] {
  const out: TopicPreference[] = [];
  for (let i = 0; i < (prefs || []).length; i++) {
    const p = prefs[i];
    if (!p) continue;
    const topic = String(p.topic || "");
    const t = normalizeSpaces(safeLower(topic));
    if (!t) {
      out.push(p);
      continue;
    }

    const idx = bioLower.indexOf(t);
    if (idx === -1) {
      out.push(p);
      continue;
    }

    const start = idx - 35 < 0 ? 0 : idx - 35;
    const end = idx + t.length + 20 > bioLower.length ? bioLower.length : idx + t.length + 20;
    const window = bioLower.slice(start, end);

    const strongNeg = /\b(hate|can'?t\s*stand|cannot\s*stand|despise)\b/.test(window);
    const mildNeg = /\b(not\s*into|don'?t\s*like|do\s*not\s*like|avoid)\b/.test(window);
    const noPrefix = new RegExp("\\bno\\s+" + escapeRegExp(t) + "\\b").test(window);

    let score = p.score;
    if (strongNeg) score = -2;
    else if (mildNeg || noPrefix) score = score < 0 ? score : -1;

    out.push({ topic: p.topic, score });
  }
  return out;
}

function prefsWithMeta(bioLower: string, prefs: TopicPreference[]): PrefWithMeta[] {
  const out: PrefWithMeta[] = [];
  for (let i = 0; i < (prefs || []).length; i++) {
    const p = prefs[i];
    if (!p) continue;
    const conf = preferenceConfidence(bioLower, p.topic);
    const canon = canonicalizeTopic(p.topic);
    out.push({ topic: p.topic, score: p.score, confidence: conf, canon });
  }
  return out;
}

function conflictStrength(aScore: number, bScore: number): number {
  return Math.abs(aScore) + Math.abs(bScore);
}

function pickPreferenceClashesDetailed(aPrefs: PrefWithMeta[], bPrefs: PrefWithMeta[], max: number, minConfidenceSum: number): string[] {
  const candidates: { topic: string; canon: string; a: number; b: number; strength: number; confSum: number }[] = [];

  const bByCanon: Record<string, PrefWithMeta[]> = Object.create(null);
  for (let i = 0; i < bPrefs.length; i++) {
    const p = bPrefs[i];
    if (!p || !p.canon) continue;
    if (!bByCanon[p.canon]) bByCanon[p.canon] = [];
    bByCanon[p.canon].push(p);
  }

  for (let i = 0; i < aPrefs.length; i++) {
    const a = aPrefs[i];
    if (!a || !a.canon) continue;
    if (!a.score) continue;
    const bs = bByCanon[a.canon];
    if (!bs || !bs.length) continue;

    for (let j = 0; j < bs.length; j++) {
      const b = bs[j];
      if (!b || !b.score) continue;

      const pa = scorePolarity(a.score);
      const pb = scorePolarity(b.score);
      if (pa === "neu" || pb === "neu") continue;
      if (pa === pb) continue;

      const confSum = (a.confidence || 0) + (b.confidence || 0);
      if (confSum < minConfidenceSum) continue;

      const strength = conflictStrength(a.score, b.score);
      const topicDisplay = a.topic && String(a.topic).length <= String(b.topic).length ? a.topic : b.topic;

      candidates.push({ topic: topicDisplay, canon: a.canon, a: a.score, b: b.score, strength, confSum });
    }
  }

  candidates.sort((x, y) => {
    if (y.strength !== x.strength) return y.strength - x.strength;
    if (y.confSum !== x.confSum) return y.confSum - x.confSum;
    return String(x.topic || "").length - String(y.topic || "").length;
  });

  const out: string[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const s = preferencePhrase("you", c.a, c.topic) + "; " + preferencePhrase("they", c.b, c.topic);
    if (out.indexOf(s) === -1) out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function pickDifferentPositives(aPrefs: PrefWithMeta[], bPrefs: PrefWithMeta[], minConfidence: number): string {
  const aTop: PrefWithMeta[] = [];
  const bTop: PrefWithMeta[] = [];

  for (let i = 0; i < aPrefs.length; i++) {
    const p = aPrefs[i];
    if (!p) continue;
    if (p.score <= 0) continue;
    if ((p.confidence || 0) < minConfidence) continue;
    aTop.push(p);
  }
  for (let i = 0; i < bPrefs.length; i++) {
    const p = bPrefs[i];
    if (!p) continue;
    if (p.score <= 0) continue;
    if ((p.confidence || 0) < minConfidence) continue;
    bTop.push(p);
  }

  aTop.sort((x, y) => Math.abs(y.score) - Math.abs(x.score));
  bTop.sort((x, y) => Math.abs(y.score) - Math.abs(x.score));

  if (!aTop.length || !bTop.length) return "";

  const bCanon: Record<string, true> = Object.create(null);
  for (let i = 0; i < bTop.length && i < 3; i++) bCanon[bTop[i].canon] = true;

  let aPick: PrefWithMeta | null = null;
  for (let i = 0; i < aTop.length && i < 3; i++) {
    if (!bCanon[aTop[i].canon]) {
      aPick = aTop[i];
      break;
    }
  }
  if (!aPick) aPick = aTop[0];

  const aCanon: Record<string, true> = Object.create(null);
  for (let i = 0; i < aTop.length && i < 3; i++) aCanon[aTop[i].canon] = true;

  let bPick: PrefWithMeta | null = null;
  for (let i = 0; i < bTop.length && i < 3; i++) {
    if (!aCanon[bTop[i].canon]) {
      bPick = bTop[i];
      break;
    }
  }
  if (!bPick) bPick = bTop[0];

  if (!aPick || !bPick) return "";
  if (aPick.canon && bPick.canon && aPick.canon === bPick.canon) return "";

  return preferencePhrase("you", aPick.score, aPick.topic) + "; " + preferencePhrase("they", bPick.score, bPick.topic);
}

const VALUES_TOKENS = [
  "kind", "kindness", "respect", "honest", "honesty", "openminded", "open-minded",
  "curious", "curiosity", "growth", "learning", "empathy", "empathetic",
  "loyal", "loyalty", "communication", "boundaries", "authentic", "authenticity",
  "adventure", "calm", "balance",
];

function normalizeValueToken(t: string): string {
  const x = safeLower(t).replace(/[^a-z0-9]/g, "");
  if (x === "openminded") return "open-minded";
  return x;
}

function sharedValues(aMap: Record<string, true>, bMap: Record<string, true>, max: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < VALUES_TOKENS.length; i++) {
    const raw = VALUES_TOKENS[i];
    const tok = normalizeValueToken(raw);
    if (!tok) continue;

    const aHas = !!aMap[tok] || (tok === "open-minded" && !!aMap["openminded"]);
    const bHas = !!bMap[tok] || (tok === "open-minded" && !!bMap["openminded"]);
    if (aHas && bHas) {
      const disp = tok === "open-minded" ? "open-minded" : raw.replace(/[^a-zA-Z-]/g, "");
      if (disp && out.indexOf(disp) === -1) out.push(disp);
      if (out.length >= max) break;
    }
  }
  return out;
}

type CuriosityStyle = "curious" | "chill" | "unknown";

function curiosityStyle(bioLower: string): CuriosityStyle {
  const curious = /\b(curious|curiosity|learning|learn|questions|ask\s*me|deep\s*talk|philosophy|psychology|books|podcast|research)\b/.test(bioLower);
  const chill = /\b(chill|laidback|easygoing|lowkey|no\s*drama|just\s*vibes|vibes|go\s*with\s*the\s*flow)\b/.test(bioLower);

  if (curious && !chill) return "curious";
  if (chill && !curious) return "chill";
  if (curious && chill) return "curious";
  return "unknown";
}

function extractHardConstraints(bioLower: string): string[] {
  const out: string[] = [];

  if (/\b(no\s*smok(ers?|ing)|non[-\s]?smoker|nonsmoker|smoke[-\s]?free)\b/.test(bioLower)) out.push("no smoking");
  if (/\b(smoker)\b/.test(bioLower) && out.indexOf("no smoking") === -1) out.push("smoking ok");
  if (/\b(sober|sobriety|no\s*alcohol|non[-\s]?drinker|nondrinker)\b/.test(bioLower)) out.push("sober/low alcohol");
  if (/\b(childfree|child[-\s]?free|no\s*kids|nokids)\b/.test(bioLower)) out.push("childfree");
  if (/\b(kids?\s*welcome|love\s*kids|family[-\s]?oriented)\b/.test(bioLower)) out.push("kids welcome");
  if (/\b(no\s*politics|nopolitics|apolitical|politics[-\s]?free)\b/.test(bioLower)) out.push("no politics");
  if (/\b(allergic|allergy)\b/.test(bioLower)) out.push("pet allergies");

  const compact: string[] = [];
  for (let i = 0; i < out.length; i++) {
    const x = out[i];
    if (!x) continue;
    if (compact.indexOf(x) !== -1) continue;
    compact.push(x);
    if (compact.length >= 2) break;
  }
  return compact;
}

type Dim = { id: string; pos: string[]; neg: string[] };

const KW_POS_SOCIAL = ["party", "parties", "events", "event", "meetup", "meetups", "social", "outgoing", "extrovert", "clubbing", "nightlife", "bar"];
const KW_NEG_SOCIAL = ["introvert", "introverted", "quiet", "reserved", "homebody", "cozy", "cosy", "calm", "alone", "solitude", "recharge", "lowkey"];
const KW_POS_PLANNING = ["planner", "planned", "organized", "organised", "structured", "schedule", "punctual", "punctuality", "routine", "list", "prepared", "plan"];
const KW_NEG_PLANNING = ["spontaneous", "spontan", "impulsive", "chaotic", "lastminute", "unplanned", "random", "flexible", "winging", "messy", "disorganized", "unstructured"];
const KW_POS_DEPTH = ["deep", "depth", "philosophy", "psychology", "meaningful", "introspective", "reflective", "thoughtful", "values", "purpose", "growth", "learning"];
const KW_NEG_DEPTH = ["smalltalk", "banter", "casual", "light", "shallow", "surface", "chitchat", "fun", "silly", "memes", "vibes", "whatever"];
const KW_POS_EARLY = ["early", "morning", "sunrise", "earlybird", "breakfast", "daytime", "brunch", "fresh", "awake", "productive", "routine", "sleep"];
const KW_NEG_EARLY = ["night", "late", "nightowl", "nocturnal", "latenight", "midnight", "afterhours", "insomnia", "tired", "sleepin", "sleeping", "club"];
const KW_POS_OUTDOORS = ["outdoors", "nature", "hiking", "wandern", "mountains", "berge", "forest", "lakes", "camping", "trail", "freshair", "adventure"];
const KW_NEG_OUTDOORS = ["indoors", "inside", "netflix", "couch", "sofa", "homebody", "cozy", "cosy", "gaming", "bed", "comfort", "lazy"];
const KW_POS_DRINKS = ["beer", "wine", "cocktail", "drinks", "drinking", "bar", "bars", "pub", "aperol", "whiskey", "gin", "brewery"];
const KW_NEG_DRINKS = ["sober", "sobriety", "nondrinker", "noalcohol", "dry", "teetotal", "abstinent", "recovery", "avoid", "clean", "health", "hangover"];
const KW_POS_FIT = ["gym", "workout", "training", "fitness", "weights", "lifting", "strength", "fit", "cardio", "exercise", "run", "active"];
const KW_NEG_FIT = ["sedentary", "couch", "inactive", "nosports", "never", "tired", "avoid", "hate", "nope", "unfit", "lazy", "injury"];
const KW_POS_TRAVEL = ["travel", "travelling", "reisen", "trip", "trips", "backpacking", "explore", "exploring", "countries", "flight", "hostel", "adventure"];
const KW_NEG_TRAVEL = ["homebody", "settled", "notravel", "stay", "local", "routine", "anxiety", "fear", "planes", "expensive", "tired", "stress"];
const KW_POS_FOODIE = ["foodie", "restaurants", "restaurant", "brunch", "tasting", "sushi", "ramen", "cooking", "try", "new", "dinner", "coffee"];
const KW_NEG_FOODIE = ["picky", "plain", "simple", "boring", "same", "cheap", "diet", "allergy", "avoid", "hate", "nope", "never"];
const KW_POS_BOOKS = ["books", "reading", "read", "novels", "literature", "library", "kindle", "bookstore", "author", "fiction", "nonfiction", "poetry"];
const KW_NEG_BOOKS = ["noreading", "hate", "boring", "never", "scrolling", "tiktok", "short", "lazy", "nope", "school", "forced", "audio"];
const KW_POS_MUSIC = ["music", "concert", "concerts", "gigs", "festival", "festivals", "spotify", "playlist", "dj", "band", "singing", "listening"];
const KW_NEG_MUSIC = ["nomusic", "hate", "silent", "quiet", "noise", "annoying", "headache", "boring", "never", "avoid", "nope", "mute"];
const KW_POS_MOVIES = ["movies", "movie", "cinema", "film", "films", "screen", "popcorn", "director", "actor", "watch", "netflix", "letterboxd"];
const KW_NEG_MOVIES = ["nomovies", "hate", "boring", "never", "avoid", "sleep", "waste", "toolong", "nope", "tired", "scrolling", "busy"];
const KW_POS_GAMING = ["gaming", "games", "videogames", "gamer", "console", "pc", "steam", "ps5", "xbox", "switch", "online", "ranked"];
const KW_NEG_GAMING = ["nogames", "hate", "boring", "waste", "addicted", "avoid", "nope", "never", "childish", "screen", "lazy", "indoors"];
const KW_POS_CREATIVE = ["creative", "create", "maker", "design", "art", "music", "write", "ideas", "build", "craft", "photography", "projects"];
const KW_NEG_CREATIVE = ["notcreative", "practical", "logic", "numbers", "boring", "avoid", "hate", "nope", "never", "work", "busy", "serious"];
const KW_POS_TECH = ["tech", "gadgets", "ai", "coding", "geek", "nerd", "apps", "startup", "hardware", "software", "robot", "innovation"];
const KW_NEG_TECH = ["notech", "analog", "offline", "paper", "simple", "oldschool", "avoid", "hate", "nope", "never", "privacy", "minimal"];
const KW_POS_KIND = ["kind", "kindness", "respect", "empathy", "empathetic", "warm", "patient", "supportive", "gentle", "caring", "friendly", "sweet"];
const KW_NEG_KIND = ["rude", "harsh", "cold", "mean", "aggressive", "blunt", "snark", "toxic", "drama", "argument", "hostile", "judgey"];
const KW_POS_DEBATE = ["debate", "discuss", "discussion", "argument", "opinions", "politics", "philosophy", "challenge", "critical", "logic", "question", "ideas"];
const KW_NEG_DEBATE = ["peace", "noconflict", "avoid", "drama", "calm", "easy", "agree", "quiet", "nope", "never", "tired", "escape"];
const KW_POS_MINIMAL = ["minimalism", "minimalist", "simple", "clean", "tidy", "declutter", "less", "order", "space", "calm", "neutral", "organized"];
const KW_NEG_MINIMAL = ["maximalist", "stuff", "clutter", "messy", "collections", "decor", "colors", "chaos", "crowded", "shopping", "impulse", "things"];
const KW_POS_CITY = ["city", "urban", "downtown", "restaurants", "nightlife", "culture", "events", "transport", "busy", "buzz", "walkable", "cafes"];
const KW_NEG_CITY = ["countryside", "rural", "village", "quiet", "nature", "space", "calm", "mountains", "forest", "farm", "slow", "remote"];
const KW_POS_PETS = ["pets", "animals", "pet", "rescue", "adopt", "cute", "cuddles", "vet", "walks", "play", "care", "love"];
const KW_NEG_PETS = ["allergy", "nopets", "mess", "hair", "smell", "dirty", "avoid", "hate", "nope", "never", "noise", "scratch"];
const KW_POS_SMOKE = ["smoking", "smoker", "cigarettes", "cigs", "nicotine", "rolling", "vape", "hookah", "shisha", "smoke", "break", "habit"];
const KW_NEG_SMOKE = ["nonsmoker", "nosmoking", "quit", "health", "avoid", "hate", "nope", "never", "smell", "asthma", "allergy", "clean"];
const KW_POS_SPORTS_WATCH = ["sportsfan", "watch", "watching", "match", "game", "stadium", "tickets", "league", "nba", "nfl", "f1", "championsleague"];
const KW_NEG_SPORTS_WATCH = ["nosports", "hate", "avoid", "nope", "never", "boring", "crowds", "noise", "time", "dumb", "yawn", "overpaid"];

const DIM_LABELS: Record<string, string> = {
  social: "social vibe", planning: "planning vs spontaneity", depth: "depth vs light chat",
  rhythm: "schedule (early vs late)", outdoors: "outdoors vs indoors", drinks: "drinks (party vs sober)",
  fitness: "activity level", travel: "travel appetite", foodie: "food curiosity", books: "reading",
  music: "music", movies: "movies", gaming: "gaming", creative: "creative energy", tech: "tech vibe",
  kindness: "tone (kind vs blunt)", debate: "debate tolerance", minimalism: "minimalism",
  citylife: "city vs countryside", pets: "pets", smoking: "smoking", sportwatching: "watching sports",
};

function makeDim(id: string, pos: string[], neg: string[]): Dim {
  return { id, pos, neg };
}

const DIMENSIONS: Dim[] = [
  makeDim("social", KW_POS_SOCIAL, KW_NEG_SOCIAL),
  makeDim("planning", KW_POS_PLANNING, KW_NEG_PLANNING),
  makeDim("depth", KW_POS_DEPTH, KW_NEG_DEPTH),
  makeDim("rhythm", KW_POS_EARLY, KW_NEG_EARLY),
  makeDim("outdoors", KW_POS_OUTDOORS, KW_NEG_OUTDOORS),
  makeDim("drinks", KW_POS_DRINKS, KW_NEG_DRINKS),
  makeDim("fitness", KW_POS_FIT, KW_NEG_FIT),
  makeDim("travel", KW_POS_TRAVEL, KW_NEG_TRAVEL),
  makeDim("foodie", KW_POS_FOODIE, KW_NEG_FOODIE),
  makeDim("books", KW_POS_BOOKS, KW_NEG_BOOKS),
  makeDim("music", KW_POS_MUSIC, KW_NEG_MUSIC),
  makeDim("movies", KW_POS_MOVIES, KW_NEG_MOVIES),
  makeDim("gaming", KW_POS_GAMING, KW_NEG_GAMING),
  makeDim("creative", KW_POS_CREATIVE, KW_NEG_CREATIVE),
  makeDim("tech", KW_POS_TECH, KW_NEG_TECH),
  makeDim("kindness", KW_POS_KIND, KW_NEG_KIND),
  makeDim("debate", KW_POS_DEBATE, KW_NEG_DEBATE),
  makeDim("minimalism", KW_POS_MINIMAL, KW_NEG_MINIMAL),
  makeDim("citylife", KW_POS_CITY, KW_NEG_CITY),
  makeDim("pets", KW_POS_PETS, KW_NEG_PETS),
  makeDim("smoking", KW_POS_SMOKE, KW_NEG_SMOKE),
  makeDim("sportwatching", KW_POS_SPORTS_WATCH, KW_NEG_SPORTS_WATCH),
  makeDim("social-energy", KW_POS_SOCIAL, KW_NEG_SOCIAL),
  makeDim("weekend-vibe", KW_POS_SOCIAL, KW_NEG_SOCIAL),
  makeDim("plans-vs-winging", KW_POS_PLANNING, KW_NEG_PLANNING),
  makeDim("structure", KW_POS_PLANNING, KW_NEG_PLANNING),
  makeDim("deep-talk", KW_POS_DEPTH, KW_NEG_DEPTH),
  makeDim("small-talk", KW_NEG_DEPTH, KW_POS_DEPTH),
  makeDim("early-bird", KW_POS_EARLY, KW_NEG_EARLY),
  makeDim("night-owl", KW_NEG_EARLY, KW_POS_EARLY),
  makeDim("nature-time", KW_POS_OUTDOORS, KW_NEG_OUTDOORS),
  makeDim("home-comfort", KW_NEG_OUTDOORS, KW_POS_OUTDOORS),
  makeDim("party-drinks", KW_POS_DRINKS, KW_NEG_DRINKS),
  makeDim("sober-vibe", KW_NEG_DRINKS, KW_POS_DRINKS),
  makeDim("active", KW_POS_FIT, KW_NEG_FIT),
  makeDim("restful", KW_NEG_FIT, KW_POS_FIT),
  makeDim("traveler", KW_POS_TRAVEL, KW_NEG_TRAVEL),
  makeDim("local-life", KW_NEG_TRAVEL, KW_POS_TRAVEL),
  makeDim("food-adventure", KW_POS_FOODIE, KW_NEG_FOODIE),
  makeDim("simple-eater", KW_NEG_FOODIE, KW_POS_FOODIE),
  makeDim("reader", KW_POS_BOOKS, KW_NEG_BOOKS),
  makeDim("non-reader", KW_NEG_BOOKS, KW_POS_BOOKS),
  makeDim("live-music", KW_POS_MUSIC, KW_NEG_MUSIC),
  makeDim("quiet-music", KW_NEG_MUSIC, KW_POS_MUSIC),
  makeDim("screen-time", KW_POS_MOVIES, KW_NEG_MOVIES),
  makeDim("no-screens", KW_NEG_MOVIES, KW_POS_MOVIES),
  makeDim("gamer", KW_POS_GAMING, KW_NEG_GAMING),
  makeDim("not-a-gamer", KW_NEG_GAMING, KW_POS_GAMING),
  makeDim("maker", KW_POS_CREATIVE, KW_NEG_CREATIVE),
  makeDim("pragmatic", KW_NEG_CREATIVE, KW_POS_CREATIVE),
  makeDim("tech-forward", KW_POS_TECH, KW_NEG_TECH),
  makeDim("analog", KW_NEG_TECH, KW_POS_TECH),
  makeDim("warmth", KW_POS_KIND, KW_NEG_KIND),
  makeDim("edge", KW_NEG_KIND, KW_POS_KIND),
  makeDim("argument-friendly", KW_POS_DEBATE, KW_NEG_DEBATE),
  makeDim("conflict-averse", KW_NEG_DEBATE, KW_POS_DEBATE),
  makeDim("declutter", KW_POS_MINIMAL, KW_NEG_MINIMAL),
  makeDim("collectors", KW_NEG_MINIMAL, KW_POS_MINIMAL),
  makeDim("city-buzz", KW_POS_CITY, KW_NEG_CITY),
  makeDim("country-calm", KW_NEG_CITY, KW_POS_CITY),
  makeDim("pet-lover", KW_POS_PETS, KW_NEG_PETS),
  makeDim("pet-avoid", KW_NEG_PETS, KW_POS_PETS),
  makeDim("smoker", KW_POS_SMOKE, KW_NEG_SMOKE),
  makeDim("non-smoker", KW_NEG_SMOKE, KW_POS_SMOKE),
  makeDim("sports-fan", KW_POS_SPORTS_WATCH, KW_NEG_SPORTS_WATCH),
  makeDim("sports-avoid", KW_NEG_SPORTS_WATCH, KW_POS_SPORTS_WATCH),
  makeDim("social-places", KW_POS_SOCIAL, KW_NEG_SOCIAL),
  makeDim("quiet-places", KW_NEG_SOCIAL, KW_POS_SOCIAL),
  makeDim("planning-detail", KW_POS_PLANNING, KW_NEG_PLANNING),
  makeDim("flexibility", KW_NEG_PLANNING, KW_POS_PLANNING),
  makeDim("curiosity", KW_POS_DEPTH, KW_NEG_DEPTH),
  makeDim("lightness", KW_NEG_DEPTH, KW_POS_DEPTH),
  makeDim("mornings", KW_POS_EARLY, KW_NEG_EARLY),
  makeDim("late-nights", KW_NEG_EARLY, KW_POS_EARLY),
  makeDim("outside", KW_POS_OUTDOORS, KW_NEG_OUTDOORS),
  makeDim("inside", KW_NEG_OUTDOORS, KW_POS_OUTDOORS),
  makeDim("bar-vibes", KW_POS_DRINKS, KW_NEG_DRINKS),
  makeDim("dry-vibes", KW_NEG_DRINKS, KW_POS_DRINKS),
  makeDim("movement", KW_POS_FIT, KW_NEG_FIT),
  makeDim("slow-life", KW_NEG_FIT, KW_POS_FIT),
  makeDim("wanderlust", KW_POS_TRAVEL, KW_NEG_TRAVEL),
  makeDim("roots", KW_NEG_TRAVEL, KW_POS_TRAVEL),
  makeDim("taste", KW_POS_FOODIE, KW_NEG_FOODIE),
  makeDim("comfort-food", KW_NEG_FOODIE, KW_POS_FOODIE),
  makeDim("bookish", KW_POS_BOOKS, KW_NEG_BOOKS),
  makeDim("not-bookish", KW_NEG_BOOKS, KW_POS_BOOKS),
  makeDim("music-head", KW_POS_MUSIC, KW_NEG_MUSIC),
  makeDim("silence", KW_NEG_MUSIC, KW_POS_MUSIC),
  makeDim("film-buff", KW_POS_MOVIES, KW_NEG_MOVIES),
  makeDim("no-films", KW_NEG_MOVIES, KW_POS_MOVIES),
  makeDim("playful-games", KW_POS_GAMING, KW_NEG_GAMING),
  makeDim("no-games", KW_NEG_GAMING, KW_POS_GAMING),
  makeDim("artist", KW_POS_CREATIVE, KW_NEG_CREATIVE),
  makeDim("practicality", KW_NEG_CREATIVE, KW_POS_CREATIVE),
  makeDim("geeky", KW_POS_TECH, KW_NEG_TECH),
  makeDim("tech-minimal", KW_NEG_TECH, KW_POS_TECH),
  makeDim("softness", KW_POS_KIND, KW_NEG_KIND),
  makeDim("sharpness", KW_NEG_KIND, KW_POS_KIND),
  makeDim("talk-it-out", KW_POS_DEBATE, KW_NEG_DEBATE),
  makeDim("keep-peace", KW_NEG_DEBATE, KW_POS_DEBATE),
  makeDim("clean-lines", KW_POS_MINIMAL, KW_NEG_MINIMAL),
  makeDim("more-is-more", KW_NEG_MINIMAL, KW_POS_MINIMAL),
  makeDim("metro", KW_POS_CITY, KW_NEG_CITY),
  makeDim("rural", KW_NEG_CITY, KW_POS_CITY),
  makeDim("animal-energy", KW_POS_PETS, KW_NEG_PETS),
  makeDim("no-animals", KW_NEG_PETS, KW_POS_PETS),
  makeDim("nicotine", KW_POS_SMOKE, KW_NEG_SMOKE),
  makeDim("smoke-free", KW_NEG_SMOKE, KW_POS_SMOKE),
  makeDim("sports-tv", KW_POS_SPORTS_WATCH, KW_NEG_SPORTS_WATCH),
  makeDim("sports-nope", KW_NEG_SPORTS_WATCH, KW_POS_SPORTS_WATCH),
];

function phraseTokens(s: string): string[] {
  const x = normalizeForPhraseSearch(s);
  return x ? x.split(" ").filter(Boolean) : [];
}

function phraseMatchOrdered(bioLowerNormalized: string, phrase: string): boolean {
  const p = normalizeForPhraseSearch(phrase);
  if (!p) return false;
  return bioLowerNormalized.indexOf(p) !== -1;
}

function keywordMatches(tokenMap: Record<string, true>, bioLowerNormalized: string, keyword: string): boolean {
  const k = String(keyword || "").trim();
  if (!k) return false;
  const canon = canonicalizeTopic(k);
  const kCanon = canon || safeLower(k);
  if (kCanon.indexOf(" ") === -1 && tokenMap[kCanon]) return true;
  if (k.indexOf(" ") !== -1 || kCanon.indexOf(" ") !== -1) {
    if (phraseMatchOrdered(bioLowerNormalized, k)) return true;
    if (kCanon !== k && phraseMatchOrdered(bioLowerNormalized, kCanon)) return true;
  }
  const toks = phraseTokens(kCanon.indexOf(" ") !== -1 ? kCanon : k);
  if (!toks.length) return false;
  for (let i = 0; i < toks.length; i++) {
    if (!tokenMap[toks[i]]) return false;
  }
  return true;
}

function collectHits(tokenMap: Record<string, true>, bioLowerNormalized: string, words: string[], max = 1): string[] {
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (keywordMatches(tokenMap, bioLowerNormalized, w)) {
      if (out.indexOf(w) === -1) out.push(w);
      if (out.length >= max) break;
    }
  }
  return out;
}

function inferVal(posHits: string[], negHits: string[]): number {
  if (posHits.length > 0 && negHits.length === 0) return 1;
  if (negHits.length > 0 && posHits.length === 0) return -1;
  return 0;
}

function pickDisplayHit(hit: string): string {
  return String(hit || "").trim();
}

function detectFrictionPhrases(aMap: Record<string, true>, aBioLowerNorm: string, bMap: Record<string, true>, bBioLowerNorm: string, max = 1): string[] {
  const out: string[] = [];

  for (let i = 0; i < DIMENSIONS.length; i++) {
    const d = DIMENSIONS[i];
    const aPos = collectHits(aMap, aBioLowerNorm, d.pos, 1);
    const aNeg = collectHits(aMap, aBioLowerNorm, d.neg, 1);
    const bPos = collectHits(bMap, bBioLowerNorm, d.pos, 1);
    const bNeg = collectHits(bMap, bBioLowerNorm, d.neg, 1);
    const aVal = inferVal(aPos, aNeg);
    const bVal = inferVal(bPos, bNeg);
    if (aVal !== 0 && bVal !== 0 && aVal !== bVal) {
      const aWord = aVal === 1 ? pickDisplayHit(aPos[0]) : pickDisplayHit(aNeg[0]);
      const bWord = bVal === 1 ? pickDisplayHit(bPos[0]) : pickDisplayHit(bNeg[0]);
      const phrase = aWord && bWord ? d.id + ": " + aWord + " vs " + bWord : "";
      if (phrase && out.indexOf(phrase) === -1) out.push(phrase);
    }
    if (out.length >= max) break;
  }
  return out;
}

type TraitSignal = { id: string; label: string; valA: number; valB: number; aHit: string; bHit: string; score: number };

function traitSignals(aMap: Record<string, true>, aNorm: string, bMap: Record<string, true>, bNorm: string, maxScan: number): TraitSignal[] {
  const out: TraitSignal[] = [];
  const seen: Record<string, true> = Object.create(null);

  for (let i = 0; i < DIMENSIONS.length && i < maxScan; i++) {
    const d = DIMENSIONS[i];
    const base = DIM_LABELS[d.id] ? d.id : d.id.split("-")[0];
    if (seen[base]) continue;
    seen[base] = true;

    const aPos = collectHits(aMap, aNorm, d.pos, 1);
    const aNeg = collectHits(aMap, aNorm, d.neg, 1);
    const bPos = collectHits(bMap, bNorm, d.pos, 1);
    const bNeg = collectHits(bMap, bNorm, d.neg, 1);

    const aVal = inferVal(aPos, aNeg);
    const bVal = inferVal(bPos, bNeg);
    if (aVal === 0 && bVal === 0) continue;

    const aHit = aVal === 1 ? (aPos[0] || "") : aVal === -1 ? (aNeg[0] || "") : "";
    const bHit = bVal === 1 ? (bPos[0] || "") : bVal === -1 ? (bNeg[0] || "") : "";

    let score = 0;
    if (aVal !== 0) score += 1;
    if (bVal !== 0) score += 1;
    if (aVal !== 0 && bVal !== 0) score += 2;
    if (aVal !== 0 && bVal !== 0 && aVal === bVal) score += 2;
    if (aVal !== 0 && bVal !== 0 && aVal !== bVal) score += 2;
    if (aHit) score += 1;
    if (bHit) score += 1;

    const label = DIM_LABELS[base] || base.replace(/[-_]/g, " ");
    out.push({ id: base, label, valA: aVal, valB: bVal, aHit, bHit, score });
  }

  out.sort((x, y) => y.score - x.score);
  return out;
}

function traitOverlapLine(ts: TraitSignal[]): string {
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i];
    if (t.valA !== 0 && t.valB !== 0 && t.valA === t.valB) {
      const side = t.valA === 1 ? "lean " + t.label : "both avoid " + t.label;
      return side;
    }
  }
  return "";
}

function traitContrastLine(ts: TraitSignal[]): string {
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i];
    if (t.valA !== 0 && t.valB !== 0 && t.valA !== t.valB) {
      const aSide = t.valA === 1 ? "you: " + (t.aHit || t.label) : "you: " + (t.aHit || ("not " + t.label));
      const bSide = t.valB === 1 ? "them: " + (t.bHit || t.label) : "them: " + (t.bHit || ("not " + t.label));
      return t.label + ": " + aSide + "; " + bSide;
    }
  }
  return "";
}

function filterUnusedTopics(used: Record<string, true>, topics: string[], max: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < (topics || []).length; i++) {
    const disp = String(topics[i] || "").trim();
    if (!disp) continue;
    const canon = canonicalizeTopic(disp);
    if (!canon) continue;
    if (used[canon]) continue;
    out.push(disp);
    used[canon] = true;
    if (out.length >= max) break;
  }
  return out;
}

function dedupeIfSame(a: string, b: string): string {
  const na = normalizeSpaces(String(a || "")).toLowerCase();
  const nb = normalizeSpaces(String(b || "")).toLowerCase();
  if (na && nb && na === nb) return "";
  return b;
}

type KeyDiffCandidate = { label: string; score: number };

function pickBestCandidate(cands: KeyDiffCandidate[]): string {
  let best: KeyDiffCandidate | null = null;
  for (let i = 0; i < (cands || []).length; i++) {
    const c = cands[i];
    if (!c || !c.label) continue;
    if (!best || c.score > best.score) best = c;
  }
  return best ? best.label : "";
}

function buildPulse(args: {
  overlap: number;
  sharedLikesCount: number;
  clashesCount: number;
  frictionCount: number;
  hardA: string[];
  hardB: string[];
  sharedValuesCount: number;
  traitSignalsCount: number;
  adultContrast: boolean;
  adultOverlap: boolean;
}): string {
  const overlap = args.overlap;
  const sharedLikes = args.sharedLikesCount;
  const clashes = args.clashesCount;
  const friction = args.frictionCount;
  const sharedValuesCount = args.sharedValuesCount;
  const traitSignalsCount = args.traitSignalsCount;

  const hardA = (args.hardA || []).join(" | ");
  const hardB = (args.hardB || []).join(" | ");
  const hardConflict =
    (hardA.indexOf("no smoking") !== -1 && hardB.indexOf("smoking ok") !== -1) ||
    (hardB.indexOf("no smoking") !== -1 && hardA.indexOf("smoking ok") !== -1);

  if (hardConflict) return "Pulse: hard mismatch";
  if (args.adultContrast) return "Pulse: high-contrast";
  if (args.adultOverlap && (sharedLikes >= 1 || traitSignalsCount >= 1)) return "Pulse: same vibe";

  if (clashes >= 2) return "Pulse: high-contrast";
  if (sharedLikes >= 2 && overlap >= 0.12) return "Pulse: easy overlap";
  if (sharedLikes >= 1 && sharedValuesCount >= 1) return "Pulse: same vibe";

  if (traitSignalsCount >= 2) return "Pulse: some overlap";

  if (friction >= 1 && overlap < 0.08) return "Pulse: different pace";
  if (overlap >= 0.12) return "Pulse: some overlap";
  return "Pulse: needs more signal";
}

function buildMatchesSection(sharedTopics: string[], sharedLikes: string[], valuesShared: string[], traitOverlap: string): string {
  const items: string[] = [];
  const seen: Record<string, true> = Object.create(null);

  for (let i = 0; i < (sharedLikes || []).length && items.length < 5; i++) {
    const item = sharedLikes[i];
    if (!seen[item]) { items.push(item); seen[item] = true; }
  }
  for (let i = 0; i < (sharedTopics || []).length && items.length < 10; i++) {
    const item = sharedTopics[i];
    if (!seen[item]) { items.push(item); seen[item] = true; }
  }
  for (let i = 0; i < (valuesShared || []).length && items.length < 10; i++) {
    const item = valuesShared[i];
    if (!seen[item]) { items.push(item); seen[item] = true; }
  }
  if (traitOverlap && !seen[traitOverlap] && items.length < 10) {
    items.push(traitOverlap); seen[traitOverlap] = true;
  }

  if (items.length === 0) return "no shared interests found";
  if (items.length === 1) return "both share interest in " + items[0];
  if (items.length === 2) return "both share interests in " + items[0] + " and " + items[1];
  if (items.length === 3) return "both share interests in " + items[0] + ", " + items[1] + " and " + items[2];
  return "both share interests in " + items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

function buildDifferencesSection(onlyA: string[], onlyB: string[], traitContrast: string, preferenceClashes: string[], friction: string[], distanceKm?: number | null): string {
  const items: string[] = [];
  const seen: Record<string, true> = Object.create(null);

  if (distanceKm !== null && distanceKm !== undefined && distanceKm > 0) {
    let distText = "";
    if (distanceKm < 10) distText = "very close";
    else if (distanceKm < 30) distText = "nearby";
    else if (distanceKm < 100) distText = "within 100km";
    else if (distanceKm < 200) distText = "around 150km apart";
    else if (distanceKm < 500) distText = "far apart";
    else distText = "very far apart";
    items.push(distText);
    seen[distText] = true;
  }

  for (let i = 0; i < (preferenceClashes || []).length && items.length < 5; i++) {
    const item = preferenceClashes[i];
    if (!seen[item]) { items.push(item); seen[item] = true; }
  }
  if (traitContrast && !seen[traitContrast] && items.length < 5) {
    items.push(traitContrast); seen[traitContrast] = true;
  }
  for (let i = 0; i < onlyA.length && items.length < 5; i++) {
    if (!seen[onlyA[i]]) { items.push(onlyA[i]); seen[onlyA[i]] = true; }
  }
  for (let i = 0; i < onlyB.length && items.length < 5; i++) {
    if (!seen[onlyB[i]]) { items.push(onlyB[i]); seen[onlyB[i]] = true; }
  }
  for (let i = 0; i < (friction || []).length && items.length < 5; i++) {
    const item = friction[i];
    if (!seen[item]) { items.push(item); seen[item] = true; }
  }

  if (items.length === 0) return "no significant differences found";
  if (items.length === 1) return "differs on " + items[0];
  if (items.length === 2) return "differs on " + items[0] + " and " + items[1];
  if (items.length === 3) return "differs on " + items[0] + ", " + items[1] + " and " + items[2];
  return "differs on " + items[0] + ", " + items[1] + ", " + items[2] + " and more";
}

function generateConversationStarters(shared: string[], onlyA: string[], onlyB: string[], valuesShared: string[]): string {
  const starters: string[] = [];
  const seen: Record<string, true> = Object.create(null);

  for (let i = 0; i < shared.length && starters.length < 12; i++) {
    if (!seen[shared[i]]) { starters.push(shared[i]); seen[shared[i]] = true; }
  }
  for (let i = 0; i < onlyA.length && starters.length < 14; i++) {
    if (!seen[onlyA[i]]) { starters.push(onlyA[i]); seen[onlyA[i]] = true; }
  }
  for (let i = 0; i < onlyB.length && starters.length < 16; i++) {
    if (!seen[onlyB[i]]) { starters.push(onlyB[i]); seen[onlyB[i]] = true; }
  }
  for (let i = 0; i < valuesShared.length && starters.length < 18; i++) {
    if (!seen[valuesShared[i]]) { starters.push(valuesShared[i]); seen[valuesShared[i]] = true; }
  }
  if (starters.length < 5) {
    const defaults = ["hobbies", "interests", "music", "travel", "food", "movies", "books", "sports", " gaming", "cooking"];
    for (let i = 0; i < defaults.length && starters.length < 10; i++) {
      if (!seen[defaults[i]]) { starters.push(defaults[i]); seen[defaults[i]] = true; }
    }
  }

  if (starters.length === 0) return "introduce yourselves and share your stories";
  if (starters.length === 1) return "discuss " + starters[0];
  if (starters.length === 2) return "discuss " + starters[0] + " and " + starters[1];
  if (starters.length === 3) return "discuss " + starters[0] + ", " + starters[1] + " and " + starters[2];
  if (starters.length === 4) return "discuss " + starters[0] + ", " + starters[1] + ", " + starters[2] + " and " + starters[3];
  return "discuss " + starters.slice(0, -1).join(", ") + " and " + starters[starters.length - 1];
}

export function buildConcreteMatchSummary(args: BuildSummaryArgs): string {
  try {
    const bioA = String(args.bioA || "");
    const bioB = String(args.bioB || "");

    if (!bioA.trim() || !bioB.trim()) {
      return exactChars(
        "Matches: incomplete profiles. Differences: complete bios to see compatibility. Conversation starters: share what you're looking for in a friend.",
        250
      );
    }

    const bioALower = safeLower(bioA);
    const bioBLower = safeLower(bioB);
    const bioALowerNorm = normalizeForPhraseSearch(bioA);
    const bioBLowerNorm = normalizeForPhraseSearch(bioB);

    const blacklist = buildNameBlacklist(args.nameA || null, args.nameB || null);

    const topicsA0 = Array.isArray(args.topicsA) ? args.topicsA : extractConcreteTopics(bioA, 24);
    const topicsB0 = Array.isArray(args.topicsB) ? args.topicsB : extractConcreteTopics(bioB, 24);
    const topicsA = filterBlacklist(topicsA0, blacklist);
    const topicsB = filterBlacklist(topicsB0, blacklist);

    const aIdx = buildCanonicalIndex(topicsA);
    const bIdx = buildCanonicalIndex(topicsB);

    const shared = intersectCanonical(aIdx, bIdx, 6);
    const onlyA = onlyCanonical(aIdx, bIdx, 4);
    const onlyB = onlyCanonical(bIdx, aIdx, 4);

    const aAna = analyzeBio(bioA);
    const bAna = analyzeBio(bioB);

    const valuesShared = sharedValues(aAna.tokenMap, bAna.tokenMap, 3);

    const hardA = extractHardConstraints(bioALower);
    const hardB = extractHardConstraints(bioBLower);

    const traits = traitSignals(aAna.tokenMap, bioALowerNorm, bAna.tokenMap, bioBLowerNorm, 80);
    const traitOverlap = traitOverlapLine(traits);
    const traitContrast = traitContrastLine(traits);

    const friction = detectFrictionPhrases(aAna.tokenMap, bioALowerNorm, bAna.tokenMap, bioBLowerNorm, 2);

    const prefsA0 = extractTopicPreferences(bioA, topicsA, 10);
    const prefsB0 = extractTopicPreferences(bioB, topicsB, 10);
    const prefsA1 = applyNegationScopeBoost(bioALower, prefsA0);
    const prefsB1 = applyNegationScopeBoost(bioBLower, prefsB0);

    const prefsA = prefsWithMeta(bioALower, prefsA1);
    const prefsB = prefsWithMeta(bioBLower, prefsB1);

    const likesA = topicsFromPrefs(prefsA, 1);
    const likesB = topicsFromPrefs(prefsB, 1);

    const likesAIdx = buildCanonicalIndex(likesA);
    const likesBIdx = buildCanonicalIndex(likesB);

    const sharedLikes = intersectCanonical(likesAIdx, likesBIdx, 3);

    const preferenceClashes = pickPreferenceClashesDetailed(prefsA, prefsB, 2, 2);

    const distanceKm = args.distanceKm;

    const matchesText = buildMatchesSection(shared, sharedLikes, valuesShared, traitOverlap);
    const differencesText = buildDifferencesSection(onlyA, onlyB, traitContrast, preferenceClashes, friction, distanceKm);
    const starters = generateConversationStarters(shared, onlyA, onlyB, valuesShared);

    let hardLine = "";
    if (hardA.length || hardB.length) {
      const combined: string[] = [];
      for (let i = 0; i < hardA.length; i++) combined.push(hardA[i]);
      for (let i = 0; i < hardB.length; i++) combined.push(hardB[i]);
      hardLine = " (" + combined.slice(0, 2).join(", ") + ")";
    }

    const parts: string[] = [];
    parts.push("Matches: " + matchesText);
    parts.push("Differences: " + differencesText + (hardLine ? hardLine : ""));
    parts.push("Talk: " + starters);

    const raw = normalizeSpaces(parts.join(". ")) + ".";
    return exactChars(raw, 250);
  } catch {
    return exactChars(
      "Matches: share interests. Differences: explore preferences. Conversation starters: hobbies, travel, music, food.",
      250
    );
  }
}

function looksStaleGeneric(s: string): boolean {
  const t = String(s || "").toLowerCase();
  if (!t.trim()) return true;
  if (t.indexOf("needs more signal") !== -1) return true;
  if (t.indexOf("bios are sparse") !== -1) return true;
  if (t.indexOf("not enough detail") !== -1) return true;
  const hasSpecific = /\b(strong matches|medium|key differences|potential clashes|safe zones|both|you|them|overlap|avoid|hate|love|like)\b/.test(t);
  return !hasSpecific;
}

export type AdultSummarySignal = { overlap: boolean; contrast: boolean };

export function adultSignalForBios(bioA: string, bioB: string): AdultSummarySignal {
  const a = extractAdultTopics(String(bioA || ""));
  const b = extractAdultTopics(String(bioB || ""));
  if (!a.length || !b.length) return { overlap: false, contrast: false };
  const res = adultOverlapLine(a, b);
  return { overlap: !!res.line && !res.isContrast, contrast: !!res.line && !!res.isContrast };
}

export function hardConstraintConflictForBios(bioA: string, bioB: string): boolean {
  const a = extractHardConstraints(safeLower(String(bioA || ""))).join(" | ");
  const b = extractHardConstraints(safeLower(String(bioB || ""))).join(" | ");
  return (
    (a.indexOf("no smoking") !== -1 && b.indexOf("smoking ok") !== -1) ||
    (b.indexOf("no smoking") !== -1 && a.indexOf("smoking ok") !== -1)
  );
}

export function summaryLooksStaleOrGeneric(s: string): boolean {
  return looksStaleGeneric(s);
}
