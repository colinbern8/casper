import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMMON_PROBLEMS, problemLabels } from '../src/data/commonProblems';
import { flowById, matchFlow } from '../src/data/staffFlows';
import { matchIssue } from '../src/data/supportMatch';
import { builtInReply } from '../server/chat';

test('every chat offers about five common problems from the one shared list', () => {
  for (const audience of ['student', 'staff'] as const) {
    const list = COMMON_PROBLEMS[audience];
    assert.ok(list.length >= 4 && list.length <= 6, `${audience}: ${list.length}`);
    assert.equal(new Set(list.map(p => p.label.en)).size, list.length, 'labels are unique');
  }
  for (const p of COMMON_PROBLEMS.student) assert.ok(p.label.en && p.label.es && p.label.en !== p.label.es, 'student labels in both languages');
});

test('the server offers the same problems as the chats when nothing matched', () => {
  assert.deepEqual(builtInReply({ isStudent: true, deviceType: '' }, 'zzz').suggestedActions, problemLabels('student'));
  assert.deepEqual(builtInReply({ isStudent: false, deviceType: '' }, 'zzz').suggestedActions, problemLabels('staff'));
});

test('typing a problem\'s label leads to the same place as tapping it', () => {
  for (const p of COMMON_PROBLEMS.staff) {
    assert.ok('flow' in p.start);
    assert.equal(matchFlow(p.label.en)?.id, flowById(p.start.flow).id, p.label.en);
  }
  for (const p of COMMON_PROBLEMS.student) {
    if (!('issue' in p.start) || p.start.issue === 'other') continue; // "Something else" is chosen, never guessed
    assert.equal(matchIssue(p.label.en), p.start.issue, p.label.en);
    assert.equal(matchIssue(p.label.es), p.start.issue, p.label.es);
  }
});
