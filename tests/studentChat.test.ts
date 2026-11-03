import { test } from 'node:test';
import assert from 'node:assert/strict';
import { choicesFor, placeholderFor, readYesNo } from '../src/components/student/conversation';
import { LANGUAGE_DIALOG, STRINGS } from '../src/i18n/studentStrings';

test('every student-facing string exists in English and Spanish, and they differ', () => {
  const en = STRINGS.en as unknown as Record<string, unknown>;
  const es = STRINGS.es as unknown as Record<string, unknown>;
  assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort());
  for (const key of Object.keys(en)) {
    if (key === 'reviewBanner') continue; // English needs no review notice
    assert.equal(typeof es[key], typeof en[key], key);
    if (typeof en[key] === 'string') assert.ok((es[key] as string).length > 0, `${key} is empty in Spanish`);
  }
  assert.deepEqual(Object.keys(STRINGS.es.errors).sort(), Object.keys(STRINGS.en.errors).sort());
  assert.ok(STRINGS.es.reviewBanner, 'Spanish screens say the text awaits human review');
  // The language pop-up appears before a language is known, so it speaks both.
  assert.match(LANGUAGE_DIALOG.title, /language/i);
  assert.match(LANGUAGE_DIALOG.title, /idioma/i);
});

test('typed yes and no are read in both languages; anything else is neither', () => {
  for (const y of ['yes', 'Sí', 'si.', 'correcto!']) assert.equal(readYesNo(y), 'yes', y);
  for (const n of ['no', 'Nope', 'incorrecto', 'nada']) assert.equal(readYesNo(n), 'no', n);
  assert.equal(readYesNo('482193'), null);
  assert.equal(readYesNo('my wifi is broken'), null);
});

test('the chat never asks for a language inside the conversation; the red tag has no skip', () => {
  const base = { lang: 'es' as const, hasStep: true, listedIds: [], atLimit: false };
  const menu = choicesFor({ ...base, phase: 'issue' }, STRINGS.es);
  assert.equal(menu.length, 5);
  assert.ok(menu.every(c => c.key.startsWith('issue:')), 'the first choices are problems, not languages');
  assert.ok(!menu.some(c => /english|español/i.test(c.label)));
  assert.deepEqual(choicesFor({ ...base, phase: 'tag' }, STRINGS.es), []);
  assert.equal(placeholderFor('tag', STRINGS.es), STRINGS.es.placeholderTag);
  assert.deepEqual(choicesFor({ ...base, phase: 'done', atLimit: true }, STRINGS.en).map(c => c.key), ['another']);
});
