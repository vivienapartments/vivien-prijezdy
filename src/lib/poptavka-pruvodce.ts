/**
 * Discover Your Atmosphere uvnitř poptávky — bodování 1:1 jako na webu vivien.
 */

import type { AptId, GuideLang } from './types';
import {
  MAIN_QUESTION_COUNT,
  MAIN_QUESTIONS_STRUCT,
  MAX_TIE_ROUNDS,
  QUIZ_APT_ACCENT,
  QUIZ_LANGS,
  QUIZ_TEXTS,
  TIE_BOOST,
  TIE_BREAKERS_STRUCT,
  type QuizAnswerKey,
  type QuizAptId,
  type QuizLang,
  type TieAnswerKey,
} from './poptavka-pruvodce-data';

export type { QuizAnswerKey, QuizAptId, TieAnswerKey };

export type QuizScores = Record<QuizAptId, number>;

export type PruvodceFaze = 'quiz' | 'tie' | 'result';

export type PruvodceVolba = {
  key: QuizAnswerKey | TieAnswerKey;
  text: string;
};

export type PruvodceOtazkaView = {
  text: string;
  options: PruvodceVolba[];
};

export type PruvodceProfil = {
  headline: string;
  body: string;
  traits: string;
};

export type PruvodceVysledek = {
  primary: AptId;
  alternatives: [AptId, AptId];
  /** Všech 5 apartmánů podle bodů (nejvyšší první). */
  ranked: AptId[];
  profiles: Record<AptId, PruvodceProfil>;
};

export type PruvodceStav = {
  phase: PruvodceFaze;
  mainAnswers: QuizAnswerKey[];
  tieBoosts: QuizAptId[];
  questionCounter: string;
  progressPercent: number;
  leadingAccent: string;
  question: PruvodceOtazkaView | null;
  result: PruvodceVysledek | null;
};

export function quizLang(lang: GuideLang): QuizLang {
  return (QUIZ_LANGS as readonly string[]).includes(lang) ? (lang as QuizLang) : 'en';
}

export function pruvodceText(lang: GuideLang, key: string): string {
  const l = quizLang(lang);
  return QUIZ_TEXTS[l][key] || QUIZ_TEXTS.en[key] || '';
}

export function aptIdFromQuiz(id: QuizAptId): AptId {
  return id.toUpperCase() as AptId;
}

export function quizIdFromApt(id: AptId): QuizAptId {
  return id.toLowerCase() as QuizAptId;
}

export function pairKey(a: QuizAptId, b: QuizAptId): string {
  return [a, b].sort().join('-');
}

function emptyScores(): QuizScores {
  return { v1: 0, v2: 0, v3: 0, v4: 0, v5: 0 };
}

function applyMainAnswer(
  questionIndex: number,
  key: QuizAnswerKey,
  s: QuizScores,
  hits: QuizScores,
): void {
  const q = MAIN_QUESTIONS_STRUCT[questionIndex];
  const opt = q?.options.find((o) => o.key === key);
  if (!opt) return;
  s[opt.primary] += 2;
  hits[opt.primary] += 1;
  s[opt.secondary] += 1;
}

function computeFromAnswers(
  main: QuizAnswerKey[],
  tieBoosts: QuizAptId[],
): { scores: QuizScores; primaryHits: QuizScores } {
  const scores = emptyScores();
  const primaryHits = emptyScores();
  main.forEach((k, i) => applyMainAnswer(i, k, scores, primaryHits));
  tieBoosts.forEach((id) => {
    scores[id] += TIE_BOOST;
  });
  return { scores, primaryHits };
}

function rankIds(scores: QuizScores, primaryHits: QuizScores): [QuizAptId, number][] {
  return (Object.entries(scores) as [QuizAptId, number][]).sort((a, b) => {
    const scoreDiff = b[1] - a[1];
    if (scoreDiff !== 0) return scoreDiff;
    const hitDiff = primaryHits[b[0]] - primaryHits[a[0]];
    if (hitDiff !== 0) return hitDiff;
    return a[0].localeCompare(b[0]);
  });
}

function needsTieBreaker(scores: QuizScores, primaryHits: QuizScores): boolean {
  const r = rankIds(scores, primaryHits);
  return r[0][1] === r[1][1];
}

function resolveTiebreaker(a: QuizAptId, b: QuizAptId) {
  const k = pairKey(a, b);
  const q = TIE_BREAKERS_STRUCT.find((t) => t.pairKey === k);
  if (!q) throw new Error(`Chybí rozstřel pro ${k}`);
  return q;
}

function tieTextKey(pair: string, part: 'text' | 'a' | 'b'): string {
  const compact = pair.replace('-', '');
  if (part === 'text') return `quiz.tie.${compact}.text`;
  return `quiz.tie.${compact}.${part}`;
}

function resultProfile(lang: GuideLang, id: QuizAptId): PruvodceProfil {
  return {
    headline: pruvodceText(lang, `quiz.result.${id}.headline`),
    body: pruvodceText(lang, `quiz.result.${id}.body`),
    traits: pruvodceText(lang, `quiz.result.${id}.traits`),
  };
}

export function prazdnyPruvodceStav(lang: GuideLang): PruvodceStav {
  return sestavPruvodceStav(lang, [], []);
}

export function sestavPruvodceStav(
  lang: GuideLang,
  mainAnswers: QuizAnswerKey[],
  tieBoosts: QuizAptId[],
): PruvodceStav {
  const { scores, primaryHits } = computeFromAnswers(mainAnswers, tieBoosts);
  const mainDone = mainAnswers.length >= MAIN_QUESTION_COUNT;
  const tieActive =
    mainDone && tieBoosts.length < MAX_TIE_ROUNDS && needsTieBreaker(scores, primaryHits);
  const showResult = mainDone && !tieActive;

  let phase: PruvodceFaze = 'quiz';
  if (showResult) phase = 'result';
  else if (tieActive) phase = 'tie';

  const ranked = rankIds(scores, primaryHits).map(([id]) => id);
  const leadId = ranked[0];
  const leadingAccent = QUIZ_APT_ACCENT[leadId] || '#c9a84c';

  let questionCounter = '';
  let progressPercent = 100;
  let question: PruvodceOtazkaView | null = null;

  if (phase === 'quiz') {
    const q = MAIN_QUESTIONS_STRUCT[mainAnswers.length];
    if (q) {
      questionCounter = `${mainAnswers.length + 1} / ${MAIN_QUESTION_COUNT}`;
      progressPercent = Math.round(((mainAnswers.length + 1) / MAIN_QUESTION_COUNT) * 100);
      question = {
        text: pruvodceText(lang, `quiz.${q.id}.text`),
        options: q.options.map((o) => ({
          key: o.key,
          text: pruvodceText(lang, `quiz.${q.id}.${o.key.toLowerCase()}`),
        })),
      };
    }
  } else if (phase === 'tie') {
    const tie = resolveTiebreaker(ranked[0], ranked[1]);
    questionCounter = pruvodceText(lang, 'quiz.ui.tieLabel');
    question = {
      text: pruvodceText(lang, tieTextKey(tie.pairKey, 'text')),
      options: tie.options.map((o) => ({
        key: o.key,
        text: pruvodceText(lang, tieTextKey(tie.pairKey, o.key.toLowerCase() as 'a' | 'b')),
      })),
    };
  }

  let result: PruvodceVysledek | null = null;
  if (showResult) {
    const primary = aptIdFromQuiz(ranked[0]);
    const alt1 = aptIdFromQuiz(ranked[1]);
    const alt2 = aptIdFromQuiz(ranked[2]);
    const profiles = {
      V1: resultProfile(lang, 'v1'),
      V2: resultProfile(lang, 'v2'),
      V3: resultProfile(lang, 'v3'),
      V4: resultProfile(lang, 'v4'),
      V5: resultProfile(lang, 'v5'),
    } as Record<AptId, PruvodceProfil>;
    result = {
      primary,
      alternatives: [alt1, alt2],
      ranked: ranked.map(aptIdFromQuiz),
      profiles,
    };
  }

  return {
    phase,
    mainAnswers: [...mainAnswers],
    tieBoosts: [...tieBoosts],
    questionCounter,
    progressPercent,
    leadingAccent,
    question,
    result,
  };
}

export function odpovedHlavni(
  lang: GuideLang,
  mainAnswers: QuizAnswerKey[],
  tieBoosts: QuizAptId[],
  key: QuizAnswerKey,
): PruvodceStav {
  if (mainAnswers.length >= MAIN_QUESTION_COUNT) {
    return sestavPruvodceStav(lang, mainAnswers, tieBoosts);
  }
  return sestavPruvodceStav(lang, [...mainAnswers, key], tieBoosts);
}

export function odpovedRozstrel(
  lang: GuideLang,
  mainAnswers: QuizAnswerKey[],
  tieBoosts: QuizAptId[],
  key: TieAnswerKey,
): PruvodceStav {
  if (tieBoosts.length >= MAX_TIE_ROUNDS) {
    return sestavPruvodceStav(lang, mainAnswers, tieBoosts);
  }
  const { scores, primaryHits } = computeFromAnswers(mainAnswers, tieBoosts);
  if (!needsTieBreaker(scores, primaryHits)) {
    return sestavPruvodceStav(lang, mainAnswers, tieBoosts);
  }
  const ranked = rankIds(scores, primaryHits);
  const tie = resolveTiebreaker(ranked[0][0], ranked[1][0]);
  const opt = tie.options.find((o) => o.key === key);
  if (!opt) return sestavPruvodceStav(lang, mainAnswers, tieBoosts);
  return sestavPruvodceStav(lang, mainAnswers, [...tieBoosts, opt.boost]);
}

export function pruvodceZpet(
  lang: GuideLang,
  mainAnswers: QuizAnswerKey[],
  tieBoosts: QuizAptId[],
): PruvodceStav {
  if (tieBoosts.length > 0) {
    return sestavPruvodceStav(lang, mainAnswers, tieBoosts.slice(0, -1));
  }
  if (mainAnswers.length > 0) {
    return sestavPruvodceStav(lang, mainAnswers.slice(0, -1), tieBoosts);
  }
  return sestavPruvodceStav(lang, mainAnswers, tieBoosts);
}

/** Seznam EN textů pro překlad do pt / sv / da (Claude). */
export function seznamPruvodceKPrekladu(): { key: string; en: string }[] {
  return Object.keys(QUIZ_TEXTS.en)
    .sort()
    .map((key) => ({ key, en: QUIZ_TEXTS.en[key] }));
}
