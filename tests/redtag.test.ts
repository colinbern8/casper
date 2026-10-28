import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRedTag, normalizeRedTag, RED_TAG_LENGTH } from '../src/data/redTag';

test('a red tag is exactly six digits: the rule the student chat and the server share', () => {
  assert.equal(RED_TAG_LENGTH, 6);
  for (const ok of ['482193', '000000', '048219', ' 482193 ', '\t482193\n']) assert.equal(isRedTag(ok), true, JSON.stringify(ok));
  for (const bad of ['', ' ', '48219', '4821934', '48219a', 'a48219', 'R-4821', '482 193', '482-193', '482.193', '+482193', '-48219', '４８２１９３', 'six', '4821931234'])
    assert.equal(isRedTag(bad), false, JSON.stringify(bad));
  for (const notText of [undefined, null, 482193, 0, true, [], {}]) assert.equal(isRedTag(notText), false);
});

test('normalizing keeps the digits exactly, including leading zeros', () => {
  assert.equal(normalizeRedTag(' 048219 '), '048219');
  assert.equal(normalizeRedTag('482193'), '482193');
});
