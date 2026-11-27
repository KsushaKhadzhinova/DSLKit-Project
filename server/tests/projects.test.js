'use strict';
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, validProject } = require('./helpers');

describe('projects: role x action', () => {
  let s;
  let owner;
  let other;
  let editor;
  let admin;
  before(async () => {
    s = await startServer();
    owner = await s.signup('user', 'Olga');
    other = await s.signup('user', 'Oleg');
    editor = await s.signup('editor', 'Edith');
    admin = await s.signup('admin', 'Adam');
  });
  after(() => s.close());

  const create = async (who, over) => (await s.api('POST', '/api/projects', { token: who.token, body: validProject(over) })).body.project;
  const get = (who, id) => s.api('GET', `/api/projects/${id}`, { token: who.token });
  const patch = (who, id, body) => s.api('PATCH', `/api/projects/${id}`, { token: who.token, body });
  const del = (who, id) => s.api('DELETE', `/api/projects/${id}`, { token: who.token });
  const missingId = '00000000-0000-4000-8000-000000000000';

  test('guest (no token) cannot use any project endpoint', async () => {
    const p = await create(owner);
    for (const [m, path] of [
      ['GET', '/api/projects'],
      ['POST', '/api/projects'],
      ['GET', `/api/projects/${p.id}`],
      ['PATCH', `/api/projects/${p.id}`],
      ['DELETE', `/api/projects/${p.id}`],
      ['GET', `/api/projects/${p.id}/members`],
    ]) {
      assert.equal((await s.api(m, path)).status, 401, `${m} ${path}`);
    }
  });

  for (const role of ['user', 'editor', 'admin']) {
    test(`${role} can create, read, update and delete an own project`, async () => {
      const who = { user: owner, editor, admin }[role];
      const p = await create(who);
      assert.equal(p.owner.id, who.id);
      assert.equal(p.access, 'owner');
      assert.equal((await get(who, p.id)).body.project.source, 'a -> b');
      const upd = await patch(who, p.id, { title: 'Renamed', source: 'x -> y' });
      assert.equal(upd.status, 200);
      assert.equal(upd.body.project.title, 'Renamed');
      assert.equal((await del(who, p.id)).status, 204);
      assert.equal((await get(who, p.id)).status, 404);
    });
  }

  test('a foreign private project looks exactly like a missing one for user and editor', async () => {
    const p = await create(owner);
    const absent = await get(owner, missingId);
    for (const who of [other, editor]) {
      for (const res of [
        await get(who, p.id),
        await patch(who, p.id, { title: 'x' }),
        await del(who, p.id),
        await s.api('GET', `/api/projects/${p.id}/members`, { token: who.token }),
      ]) {
        assert.equal(res.status, 404);
        assert.deepEqual(res.body, absent.body);
      }
    }
    assert.equal((await get(owner, p.id)).body.project.title, 'Flow', 'untouched');
  });

  test('a malformed project id is 404, not an error', async () => {
    for (const id of ['abc', '1; DROP TABLE projects', '%00']) {
      assert.equal((await get(owner, encodeURIComponent(id))).status, 404);
    }
  });

  test('admin reads, writes and deletes a foreign private project', async () => {
    const p = await create(owner);
    assert.equal((await get(admin, p.id)).status, 200);
    assert.equal((await patch(admin, p.id, { title: 'By admin' })).status, 200);
    assert.equal((await del(admin, p.id)).status, 204);
  });

  test('shared project: user reads but cannot write or delete (403), editor writes but cannot delete, admin deletes', async () => {
    const p = await create(owner, { visibility: 'shared' });
    assert.equal((await get(other, p.id)).status, 200);
    assert.equal((await get(other, p.id)).body.project.access, 'read');
    assert.equal((await patch(other, p.id, { title: 'x' })).status, 403);
    assert.equal((await del(other, p.id)).status, 403);
    const e = await patch(editor, p.id, { title: 'By editor' });
    assert.equal(e.status, 200);
    assert.equal(e.body.project.access, 'write');
    assert.equal((await del(editor, p.id)).status, 403);
    assert.equal((await del(admin, p.id)).status, 204);
  });

  test('an editor of a shared project cannot change its visibility (403)', async () => {
    const p = await create(owner, { visibility: 'shared' });
    assert.equal((await patch(editor, p.id, { visibility: 'private' })).status, 403);
    assert.equal((await patch(admin, p.id, { visibility: 'shared' })).status, 200);
  });

  test('an owner can make a project private again and others lose it', async () => {
    const p = await create(owner, { visibility: 'shared' });
    assert.equal((await get(other, p.id)).status, 200);
    await patch(owner, p.id, { visibility: 'private' });
    assert.equal((await get(other, p.id)).status, 404);
  });

  describe('members', () => {
    test('owner grants read, then write; the member gains exactly that', async () => {
      const p = await create(owner);
      const put = (access) => s.api('PUT', `/api/projects/${p.id}/members/${other.id}`, { token: owner.token, body: { access } });
      assert.equal((await put('read')).status, 200);
      assert.equal((await get(other, p.id)).body.project.access, 'read');
      assert.equal((await patch(other, p.id, { title: 'x' })).status, 403);
      assert.equal((await put('write')).status, 200);
      assert.equal((await patch(other, p.id, { title: 'Member edit' })).status, 200);
      assert.equal((await del(other, p.id)).status, 403);
      const list = await s.api('GET', `/api/projects/${p.id}/members`, { token: owner.token });
      assert.deepEqual(
        list.body.items.map((m) => [m.userId, m.access]),
        [[other.id, 'write']],
      );
      assert.equal(list.text.includes(other.email), false, 'no email in member list');
    });

    test('removing the member removes the access', async () => {
      const p = await create(owner);
      await s.api('PUT', `/api/projects/${p.id}/members/${other.id}`, { token: owner.token, body: { access: 'read' } });
      assert.equal((await s.api('DELETE', `/api/projects/${p.id}/members/${other.id}`, { token: owner.token })).status, 204);
      assert.equal((await get(other, p.id)).status, 404);
      assert.equal((await s.api('DELETE', `/api/projects/${p.id}/members/${other.id}`, { token: owner.token })).status, 404);
    });

    test('a member or a reader of a shared project cannot manage members (403); a stranger gets 404', async () => {
      const p = await create(owner);
      await s.api('PUT', `/api/projects/${p.id}/members/${other.id}`, { token: owner.token, body: { access: 'write' } });
      const attempt = (who) => s.api('PUT', `/api/projects/${p.id}/members/${who.id}`, { token: other.token, body: { access: 'write' } });
      assert.equal((await attempt(editor)).status, 403);
      const hidden = await create(owner);
      const res = await s.api('PUT', `/api/projects/${hidden.id}/members/${editor.id}`, { token: other.token, body: { access: 'read' } });
      assert.equal(res.status, 404);
    });

    test('admin may manage members of a foreign project', async () => {
      const p = await create(owner);
      assert.equal((await s.api('PUT', `/api/projects/${p.id}/members/${other.id}`, { token: admin.token, body: { access: 'read' } })).status, 200);
    });

    test('member input is validated; the owner and unknown users cannot be added', async () => {
      const p = await create(owner);
      const put = (userId, body) => s.api('PUT', `/api/projects/${p.id}/members/${userId}`, { token: owner.token, body });
      assert.equal((await put(other.id, { access: 'admin' })).status, 400);
      assert.equal((await put(other.id, { access: 'read', x: 1 })).status, 400);
      assert.equal((await put(missingId, { access: 'read' })).status, 404);
      assert.equal((await put('nope', { access: 'read' })).status, 404);
      assert.equal((await put(owner.id, { access: 'read' })).status, 400);
    });
  });

  describe('input validation', () => {
    const bad = [
      ['empty title', { title: '' }],
      ['title over 80 chars', { title: 'x'.repeat(81) }],
      ['title is a number', { title: 7 }],
      ['description over 500', { description: 'd'.repeat(501) }],
      ['source over the limit', { source: 's'.repeat(200001) }],
      ['source is an object', { source: {} }],
      ['bad notation', { notation: 'Bad Notation!' }],
      ['notation over 40', { notation: 'a'.repeat(41) }],
      ['unknown visibility', { visibility: 'public' }],
      ['ownerId mass assignment', { ownerId: 'x' }],
      ['id mass assignment', { id: missingId }],
    ];
    for (const [name, over] of bad) {
      test(`create rejects ${name}`, async () => {
        const res = await s.api('POST', '/api/projects', { token: owner.token, body: validProject(over) });
        assert.equal(res.status, 400);
        assert.equal(res.body.error.code, 'validation_failed');
      });
    }

    test('create requires a title and a notation; the source defaults to empty', async () => {
      assert.equal((await s.api('POST', '/api/projects', { token: owner.token, body: { notation: 'flowchart' } })).status, 400);
      const ok = await s.api('POST', '/api/projects', { token: owner.token, body: { title: 'Min', notation: 'flowchart' } });
      assert.equal(ok.status, 201);
      assert.equal(ok.body.project.source, '');
      assert.equal(ok.body.project.visibility, 'private');
    });

    test('values at the exact limit are accepted', async () => {
      const ok = await s.api('POST', '/api/projects', {
        token: owner.token,
        body: validProject({ title: 't'.repeat(80), description: 'd'.repeat(500), notation: 'n'.repeat(40), source: 's'.repeat(200000) }),
      });
      assert.equal(ok.status, 201);
    });

    test('update refuses an empty body, unknown fields and a changed owner', async () => {
      const p = await create(owner);
      assert.equal((await patch(owner, p.id, {})).status, 400);
      assert.equal((await patch(owner, p.id, { ownerId: other.id })).status, 400);
      assert.equal((await patch(owner, p.id, { title: '' })).status, 400);
    });

    test('script and SQL text is stored as plain data and returned verbatim', async () => {
      const title = "<img src=x onerror=alert(1)>'; DROP TABLE projects;--";
      const p = await create(owner, { title: title.slice(0, 80) });
      assert.equal((await get(owner, p.id)).body.project.title, title.slice(0, 80));
      assert.equal((await s.api('GET', '/api/projects', { token: owner.token })).status, 200);
    });
  });

  describe('list, paging and search', () => {
    let a;
    let b;
    before(async () => {
      a = await s.signup('user', 'Lister A');
      b = await s.signup('user', 'Lister B');
      for (let i = 1; i <= 5; i++) await create(a, { title: `Alpha ${i}`, description: i === 2 ? '50%_off' : 'plain' });
      await create(a, { title: 'Beta', visibility: 'shared' });
      await create(b, { title: 'Hidden of B' });
      const m = await create(b, { title: 'Member of B' });
      await s.api('PUT', `/api/projects/${m.id}/members/${a.id}`, { token: b.token, body: { access: 'read' } });
    });
    const list = (who, qs = '') => s.api('GET', `/api/projects${qs}`, { token: who.token });

    test('a user sees own, shared and member projects but never foreign private ones', async () => {
      const titles = (await list(a, '?pageSize=50')).body.items.map((p) => p.title);
      assert.ok(titles.includes('Beta'));
      assert.ok(titles.includes('Member of B'));
      assert.equal(titles.includes('Hidden of B'), false);
    });

    test('list items carry the owner name but never an email or the source', async () => {
      const res = await list(b, '?pageSize=50');
      assert.doesNotMatch(res.text, /@example\.test/);
      assert.equal('source' in res.body.items[0], false);
      assert.ok(res.body.items.every((p) => typeof p.owner.displayName === 'string'));
    });

    test('paging reports totals and does not overlap pages', async () => {
      const p1 = (await list(a, '?pageSize=3&page=1&sort=title&order=asc')).body;
      const p2 = (await list(a, '?pageSize=3&page=2&sort=title&order=asc')).body;
      assert.equal(p1.pageSize, 3);
      assert.ok(p1.total >= 7);
      assert.equal(p1.items.length, 3);
      assert.equal(p1.items.filter((x) => p2.items.some((y) => y.id === x.id)).length, 0);
    });

    test('search matches title and description case-insensitively', async () => {
      assert.equal((await list(a, '?q=alpha')).body.items.length, 5);
      assert.equal((await list(a, '?q=PLAIN')).body.items.length, 4);
    });

    test('LIKE wildcards in the search are literal', async () => {
      assert.equal((await list(a, '?q=%25')).body.items.length, 1);
      assert.equal((await list(a, '?q=_')).body.items.length, 1);
      assert.equal((await list(a, `?q=${encodeURIComponent('50%_off')}`)).body.items.length, 1);
    });

    test('search works for Cyrillic in any letter case, with accents folded only by case', async () => {
      await create(a, { title: 'Привет Мир', description: 'Ёлка и ÉCOLE' });
      for (const q of ['привет', 'ПРИВЕТ', 'мир', 'ёлка', 'Ёлка', 'école', 'ÉCOLE']) {
        assert.equal((await list(a, `?q=${encodeURIComponent(q)}`)).body.items.length, 1, q);
      }
      assert.equal((await list(a, `?q=${encodeURIComponent('привет мир')}`)).body.items.length, 1);
      assert.equal((await list(a, `?q=${encodeURIComponent('приве!')}`)).body.items.length, 0);
    });

    test('yo and ye are treated as the same letter in search', async () => {
      await create(a, { title: '\u0401\u0436\u0438\u043a \u041c\u0451\u0434' });
      for (const q of ['\u0435\u0436\u0438\u043a', '\u0451\u0436\u0438\u043a', '\u043c\u0435\u0434', '\u041c\u0401\u0414']) {
        assert.equal((await list(a, `?q=${encodeURIComponent(q)}`)).body.items.length, 1, q);
      }
    });

    test('a long title and description are searchable and fit the search column', async () => {
      const p = await create(a, { title: '\u0130'.repeat(80), description: '\u0130'.repeat(500) });
      const row = await s.db.Project.findByPk(p.id);
      assert.ok(row.searchText.length <= 1000, String(row.searchText.length));
      assert.ok((await list(a, `?q=${encodeURIComponent('\u0130\u0130')}`)).body.items.some((x) => x.id === p.id));
    });

    test('a renamed project is found under its new name only', async () => {
      const p = await create(a, { title: 'Oldname' });
      await s.api('PATCH', `/api/projects/${p.id}`, { token: a.token, body: { title: 'Новое имя' } });
      assert.equal((await list(a, '?q=oldname')).body.items.length, 0);
      assert.equal((await list(a, `?q=${encodeURIComponent('НОВОЕ')}`)).body.items.length, 1);
    });

    test('SQL injection in search returns nothing and does not fail', async () => {
      const res = await list(a, `?q=${encodeURIComponent("' OR '1'='1")}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.items.length, 0);
    });

    test('paging, sort and search parameters are validated', async () => {
      for (const qs of [
        '?page=0',
        '?page=x',
        '?pageSize=51',
        '?pageSize=0',
        '?sort=password',
        '?sort=title;DROP',
        '?order=sideways',
        `?q=${'q'.repeat(81)}`,
        '?visibility=public',
        '?page=1&page=2',
      ]) {
        const res = await list(a, qs);
        assert.equal(res.status, 400, qs);
        assert.equal(res.body.error.code, 'validation_failed');
      }
    });

    test('mine=true and visibility filters narrow the list', async () => {
      const mine = (await list(a, '?mine=true&pageSize=50')).body.items;
      assert.ok(mine.every((p) => p.owner.id === a.id));
      const shared = (await list(a, '?visibility=shared&pageSize=50')).body.items;
      assert.ok(shared.every((p) => p.visibility === 'shared'));
    });
  });
});
