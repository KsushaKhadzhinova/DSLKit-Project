'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROLES, ACTIONS, can, projectAccess } = require('../src/permissions');

const project = (over = {}) => ({ ownerId: 'owner', visibility: 'private', ...over });
const user = (role, id = 'me') => ({ id, role });

test('every action lists only known roles', () => {
  for (const [action, roles] of Object.entries(ACTIONS)) {
    for (const r of roles) assert.ok(ROLES.includes(r), `${action}: ${r}`);
  }
});

test('can() is false for an unknown role or action', () => {
  assert.equal(can('guest', 'project.create'), false);
  assert.equal(can('user', 'nope'), false);
  assert.equal(can('admin', 'users.list'), true);
});

test('owner has every project right', () => {
  const a = projectAccess(user('user', 'owner'), project(), null);
  assert.deepEqual(a, { read: true, write: true, delete: true, manage: true, level: 'owner' });
});

test('stranger sees nothing in a private project', () => {
  const a = projectAccess(user('user'), project(), null);
  assert.deepEqual(a, { read: false, write: false, delete: false, manage: false, level: null });
});

test('shared project: everyone reads, only editor and admin write, only admin deletes', () => {
  const p = project({ visibility: 'shared' });
  const u = projectAccess(user('user'), p, null);
  assert.equal(u.read, true);
  assert.equal(u.write, false);
  const e = projectAccess(user('editor'), p, null);
  assert.equal(e.write, true);
  assert.equal(e.delete, false);
  assert.equal(e.manage, false);
  assert.equal(projectAccess(user('admin'), p, null).delete, true);
});

test('member access: read grants read, write grants read and write, never delete or manage', () => {
  const r = projectAccess(user('user'), project(), { access: 'read' });
  assert.deepEqual([r.read, r.write, r.delete, r.manage], [true, false, false, false]);
  const w = projectAccess(user('user'), project(), { access: 'write' });
  assert.deepEqual([w.read, w.write, w.delete, w.manage], [true, true, false, false]);
});

test('admin has every right on a private foreign project', () => {
  const a = projectAccess(user('admin'), project(), null);
  assert.deepEqual([a.read, a.write, a.delete, a.manage], [true, true, true, true]);
});

// The documents must carry the same matrix the code enforces.
for (const file of ['ROLES.md', 'ROLES.en.md']) {
  test(`${file} matches the permission matrix`, () => {
    const text = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const rows = new Map();
    for (const line of text.split('\n')) {
      const m = line.match(/^\|\s*`([a-zA-Z.]+)`\s*\|(.*)\|\s*$/);
      if (m)
        rows.set(
          m[1],
          m[2].split('|').map((c) => c.trim()),
        );
    }
    assert.deepEqual([...rows.keys()].sort(), Object.keys(ACTIONS).sort());
    for (const [action, cells] of rows) {
      // columns: description, guest, user, editor, admin
      assert.equal(cells.length, 5, action);
      assert.equal(cells[1], '—', `${action} guest`);
      ROLES.forEach((role, i) => {
        assert.equal(cells[i + 2], ACTIONS[action].includes(role) ? '✓' : '—', `${action} ${role}`);
      });
    }
  });
}
