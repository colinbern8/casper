import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchIssue } from '../src/data/supportMatch';

test('typed English is matched to the closest common problem', () => {
  const cases: Array<[string, string | null]> = [
    ["my chromebook won't connect to the internet", 'wifi'],
    ['wifi is not working', 'wifi'],
    ['it will not turn on', 'power'],
    ['the battery is dead', 'power'],
    ['black screen and no lights', 'power'],
    ['I forgot my password', 'login'],
    ["can't sign in to my account", 'login'],
    ['the screen is cracked', 'damaged'],
    ['I spilled water on it', 'damaged'],
    ['I dropped it', 'damaged'],
    ['my keyboard types the wrong letters', null],
    ['hello', null],
    ['', null],
    ['   ', null],
  ];
  for (const [text, want] of cases) assert.equal(matchIssue(text), want, text);
});

test('typed Spanish is matched too, with or without accents', () => {
  const cases: Array<[string, string | null]> = [
    ['no tengo internet', 'wifi'],
    ['no puedo conectarme al wifi', 'wifi'],
    ['mi chromebook no prende', 'power'],
    ['Mi Chromebook no enciende', 'power'],
    ['se me acabó la batería', 'power'],
    ['olvidé mi contraseña', 'login'],
    ['olvide mi contrasena', 'login'],
    ['no puedo iniciar sesión', 'login'],
    ['se me cayó y la pantalla está rota', 'damaged'],
    ['le derramé agua', 'damaged'],
    ['el teclado escribe raro', null],
  ];
  for (const [text, want] of cases) assert.equal(matchIssue(text), want, text);
});

test('a damaged device wins over other keywords, and "other" is never guessed', () => {
  assert.equal(matchIssue('I dropped it and now it will not turn on or connect to wifi'), 'damaged');
  assert.equal(matchIssue('the charger is broken'), 'damaged');
  for (const text of ['something strange', 'ayuda por favor', 'my mouse is stuck']) assert.notEqual(matchIssue(text), 'other');
});
