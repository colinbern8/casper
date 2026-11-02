import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadLanguage, loadProfile, missingFields, saveLanguage, saveProfile } from '../src/profile';
import { filterRooms } from '../src/data/schools';

/** A tiny stand-in for the browser's localStorage. */
let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  };
});

test('missingFields flags empty and whitespace-only required fields', () => {
  assert.deepEqual(missingFields({ school: 'A', room: '  ' }), ['room']);
  assert.deepEqual(missingFields({ school: '', room: '' }), ['school', 'room']);
  assert.deepEqual(missingFields({ school: 'A', room: '101' }), []);
});

test('filterRooms matches anywhere in the name, ignoring case', () => {
  const rooms = ['Room 101', 'Library', 'Gym', 'Science Lab 2'];
  assert.deepEqual(filterRooms(rooms, 'lab'), ['Science Lab 2']);
  assert.deepEqual(filterRooms(rooms, ' 1'), ['Room 101']);
  assert.deepEqual(filterRooms(rooms, ''), rooms);
  assert.deepEqual(filterRooms(rooms, 'zzz'), []);
});

test('saved profile round-trips per account and ignores incomplete entries', () => {
  const p = { school: 'North High', room: '12', phoneOrExt: '' };
  saveProfile('A@d.test', p);
  assert.deepEqual(loadProfile('a@d.test'), p);
  assert.equal(loadProfile('b@d.test'), null);
  store.set('casper.profile.v2.c@d.test', JSON.stringify({ school: 'X' }));
  assert.equal(loadProfile('c@d.test'), null);
});

test('the chosen language is remembered per account, and anything unexpected counts as not chosen', () => {
  assert.equal(loadLanguage('kid@d.test'), null, 'first visit: no language yet, so the pop-up shows');
  saveLanguage('Kid@d.test', 'es');
  assert.equal(loadLanguage('kid@d.test'), 'es');
  assert.equal(loadLanguage('other@d.test'), null, 'another account on the same browser still gets the pop-up');
  saveLanguage('kid@d.test', 'en');
  assert.equal(loadLanguage('KID@d.test'), 'en');
  store.set('casper.language.v1.odd@d.test', 'fr');
  assert.equal(loadLanguage('odd@d.test'), null);
  (globalThis as { localStorage?: unknown }).localStorage = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  assert.equal(loadLanguage('kid@d.test'), null, 'blocked storage never breaks the page');
  assert.doesNotThrow(() => saveLanguage('kid@d.test', 'es'));
});
