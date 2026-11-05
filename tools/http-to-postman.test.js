import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHttp, toPostman } from './http-to-postman.js';

const sample = `### Sample file
@base = http://localhost:3000

### List -> 200
GET {{base}}/diagrams?q=a&sort=-title

### Create -> 201
POST {{base}}/diagrams
Content-Type: application/json

{ "title": "A" }

### Login -> 200
# @name login
POST {{base}}/auth/login
Content-Type: application/json

{ "email": "a@b.c" }

###
@token = {{login.response.body.token}}

### Profile -> 200
GET {{base}}/profile
Authorization: Bearer {{token}}
`;

test('parseHttp reads requests, headers, bodies, variables and captured values', () => {
  const { variables, captures, requests } = parseHttp(sample);
  assert.deepEqual(variables, { base: 'http://localhost:3000' });
  assert.deepEqual(captures, { login: { variable: 'token', field: 'token' } });
  assert.deepEqual(
    requests.map((r) => [r.method, r.url]),
    [
      ['GET', '{{base}}/diagrams?q=a&sort=-title'],
      ['POST', '{{base}}/diagrams'],
      ['POST', '{{base}}/auth/login'],
      ['GET', '{{base}}/profile'],
    ],
  );
  assert.equal(requests[1].body, '{ "title": "A" }');
  assert.deepEqual(requests[3].headers, [{ key: 'Authorization', value: 'Bearer {{token}}' }]);
  assert.equal(requests[2].name, 'login');
});

test('toPostman builds a v2.1 collection with status tests and a token capture', () => {
  const collection = toPostman(sample, 'Sample');
  assert.match(collection.info.schema, /v2\.1\.0/);
  assert.deepEqual(collection.variable, [
    { key: 'base', value: 'http://localhost:3000' },
    { key: 'token', value: '' },
  ]);
  const [list, create, login] = collection.item;
  assert.deepEqual(list.request.url, {
    raw: '{{base}}/diagrams?q=a&sort=-title',
    host: ['{{base}}'],
    path: ['diagrams'],
    query: [
      { key: 'q', value: 'a' },
      { key: 'sort', value: '-title' },
    ],
  });
  assert.equal(create.request.body.raw, '{ "title": "A" }');
  assert.match(list.event[0].script.exec[0], /status is 200/);
  assert.match(login.event[0].script.exec.join('\n'), /collectionVariables\.set\('token'/);
});

test('a request without a status in its title gets no test and an absolute URL is split', () => {
  const [item] = toPostman('### Plain\nDELETE http://localhost:3000/api/users/1\n', 'X').item;
  assert.equal(item.event, undefined);
  assert.deepEqual(item.request.url.path, ['api', 'users', '1']);
  assert.deepEqual(item.request.url.host, ['http://localhost:3000']);
});
