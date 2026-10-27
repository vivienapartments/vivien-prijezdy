import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import * as TX from './texts';
import * as VT from './vstup-texty';

const PLACEHOLDER_RE =
  /\{kroky\}|\{čas\}|\{částka\}|\{\{STANI\}\}|\{\{BRANA_TELEFON\}\}|\{\{POPLATEK_NOCI\}\}|\{\{POPLATEK_OSOB\}\}|\{\{VYJEZD\}\}|\{\{WEB\}\}|\{\{QUIZ\}\}|\{\{M\}\}|\{\{MIN\}\}|\$\{[^}]+\}/g;

function placeholders(s: string): string[] {
  const out = new Set<string>();
  const re = new RegExp(PLACEHOLDER_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out.add(m[0]);
  return [...out].sort();
}

function checkLangObj(
  obj: Record<string, unknown>,
  path: string,
  issues: string[],
  missing: string[],
) {
  if (typeof obj.en !== 'string') return;
  const en = placeholders(obj.en);
  for (const lang of ['fr', 'it'] as const) {
    const raw = obj[lang];
    if (typeof raw !== 'string') {
      missing.push(`${path}: chybí ${lang}`);
      continue;
    }
    const got = placeholders(raw);
    const miss = en.filter((k) => !got.includes(k));
    const extra = got.filter((k) => !en.includes(k));
    if (miss.length || extra.length) {
      issues.push(
        `${path} [${lang}] chybí=${miss.join(',') || '—'} navíc=${extra.join(',') || '—'}`,
      );
    }
  }
}

function walk(value: unknown, path: string, issues: string[], missing: string[]) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => walk(v, `${path}[${i}]`, issues, missing));
    return;
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj.en === 'string') checkLangObj(obj, path, issues, missing);
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'en' || k === 'fr' || k === 'it') continue;
    walk(v, path ? `${path}.${k}` : k, issues, missing);
  }
}

describe('fr a it zástupné znaky jako en', () => {
  it('pruvodce.json, texts a vstup-texty', () => {
    const issues: string[] = [];
    const missing: string[] = [];
    const pruvodce = JSON.parse(
      readFileSync(join(process.cwd(), 'src/data/pruvodce.json'), 'utf8'),
    ) as unknown;
    walk(pruvodce, 'pruvodce', issues, missing);
    walk(TX, 'texts', issues, missing);
    walk(VT, 'vstup-texty', issues, missing);
    // Chybějící fr/it jen vypíšeme (neopravujeme). Nesoulad placeholderů padá.
    if (missing.length) {
      console.warn('Chybí fr/it:\n' + missing.join('\n'));
    }
    expect(issues).toEqual([]);
  });
});
