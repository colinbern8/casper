import { test } from 'node:test';
import assert from 'node:assert/strict';
import { missingFields } from '../src/profile';
import { filterRooms } from '../src/data/schools';

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
