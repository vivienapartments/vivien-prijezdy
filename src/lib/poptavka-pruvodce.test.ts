import { describe, expect, it } from 'vitest';
import {
  odpovedHlavni,
  odpovedRozstrel,
  prazdnyPruvodceStav,
  pruvodceText,
  quizLang,
  seznamPruvodceKPrekladu,
  sestavPruvodceStav,
  type QuizAnswerKey,
} from './poptavka-pruvodce';

describe('poptavka-pruvodce Discover', () => {
  it('pt/sv/da mají vlastní texty (PROMPT-80)', () => {
    expect(quizLang('pt')).toBe('pt');
    expect(quizLang('sv')).toBe('sv');
    expect(quizLang('da')).toBe('da');
    expect(quizLang('cs')).toBe('cs');
    expect(quizLang('de')).toBe('de');
    expect(pruvodceText('sv', 'quiz.q1.text')).toContain('lägenheten');
    expect(pruvodceText('pt', 'quiz.q1.text')).toContain('apartamento');
    expect(pruvodceText('da', 'quiz.q1.text')).toContain('lejligheden');
  });

  it('všechny jazyky mají neprázdné zobrazované klíče', async () => {
    const { QUIZ_LANGS, QUIZ_TEXTS } = await import('./poptavka-pruvodce-data');
    const keys = Object.keys(QUIZ_TEXTS.en).filter((k) => !k.includes('.body'));
    for (const lang of QUIZ_LANGS) {
      for (const key of keys) {
        const t = (QUIZ_TEXTS[lang][key] || '').trim();
        expect(t.length > 0, `${lang} ${key}`).toBe(true);
      }
    }
  });

  it('má české otázky 1:1', () => {
    expect(pruvodceText('cs', 'quiz.q1.text')).toBe(
      'Co od apartmánu potřebujete hned po příjezdu?',
    );
    expect(pruvodceText('en', 'quiz.q1.text')).toBe(
      'What do you need from the apartment right after arrival?',
    );
  });

  it('šest odpovědí C vede k V1 bez rozstřelu', () => {
    let stav = prazdnyPruvodceStav('cs');
    const keys: QuizAnswerKey[] = ['C', 'B', 'E', 'E', 'C', 'C'];
    for (const k of keys) {
      stav = odpovedHlavni('cs', stav.mainAnswers, stav.tieBoosts, k);
    }
    expect(stav.phase).toBe('result');
    expect(stav.result?.primary).toBe('V1');
  });

  it('po šesti odpovědích je výsledek nebo rozstřel, rozstřel A ukončí', () => {
    const keys: QuizAnswerKey[] = ['A', 'E', 'D', 'C', 'B', 'A'];
    let stav = sestavPruvodceStav('cs', keys, []);
    expect(['tie', 'result']).toContain(stav.phase);
    if (stav.phase === 'tie') {
      stav = odpovedRozstrel('cs', stav.mainAnswers, stav.tieBoosts, 'A');
    }
    expect(stav.phase).toBe('result');
    expect(stav.result?.primary).toMatch(/^V[1-5]$/);
    expect(stav.result?.alternatives).toHaveLength(2);
    expect(stav.result?.profiles.V1.body.length).toBeGreaterThan(20);
  });

  it('seznam k překladu má 90 EN textů', () => {
    const list = seznamPruvodceKPrekladu();
    expect(list.length).toBe(90);
    expect(list[0].key.startsWith('quiz.')).toBe(true);
    expect(list.every((x) => x.en.trim().length > 0)).toBe(true);
  });
});
