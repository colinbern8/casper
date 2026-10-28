import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepActions, actionKind } from '../src/data/stepActions';

test('last step shows each action once; staff get ticket, students get loaner', () => {
  assert.deepEqual(stepActions({ isLastStep: true, isStudent: false }), ['Issue resolved', 'Submit IT ticket']);
  assert.deepEqual(stepActions({ isLastStep: true, isStudent: true }), ['Issue resolved', 'Request loaner device']);
});

test('earlier steps offer next step too', () => {
  assert.deepEqual(stepActions({ isLastStep: false, isStudent: false }), ['Issue resolved', 'Try next step', 'Submit IT ticket']);
});

test('actionKind classifies the three coloured buttons', () => {
  assert.equal(actionKind('Issue resolved'), 'resolved');
  assert.equal(actionKind('Try next step'), 'next');
  assert.equal(actionKind('Submit IT ticket'), 'escalate');
  assert.equal(actionKind('Request loaner device'), 'escalate');
  assert.equal(actionKind('Contact IT'), 'other');
});
