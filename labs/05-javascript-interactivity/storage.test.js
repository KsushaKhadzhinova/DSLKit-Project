import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryBackend, createStorage, getStorage } from '../../site/js/utils/storage.js';

const throwingBackend = (methods) => ({
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  ...methods,
});

describe('createMemoryBackend', () => {
  it('returns null for a missing key', () => {
    const backend = createMemoryBackend();
    assert.equal(backend.getItem('missing'), null);
  });

  it('stores values as strings and returns them', () => {
    const backend = createMemoryBackend();
    backend.setItem('answer', 42);
    assert.equal(backend.getItem('answer'), '42');
    backend.setItem('text', 'hello');
    assert.equal(backend.getItem('text'), 'hello');
  });

  it('removes a stored key and ignores removal of a missing key', () => {
    const backend = createMemoryBackend();
    backend.setItem('key', 'value');
    backend.removeItem('key');
    assert.equal(backend.getItem('key'), null);
    assert.doesNotThrow(() => backend.removeItem('never-set'));
  });

  it('keeps separate memory backends isolated', () => {
    const first = createMemoryBackend();
    const second = createMemoryBackend();
    first.setItem('shared', 'one');
    assert.equal(second.getItem('shared'), null);
  });
});

describe('createStorage', () => {
  it('returns the fallback for a missing key', () => {
    const storage = createStorage(createMemoryBackend());
    assert.equal(storage.get('missing'), null);
    assert.equal(storage.get('missing', 'default'), 'default');
  });

  it('round-trips JSON values with the default prefix', () => {
    const backend = createMemoryBackend();
    const storage = createStorage(backend);
    assert.equal(storage.set('user', { name: 'Ksenia', tags: ['a', 'b'] }), true);
    assert.deepEqual(storage.get('user'), { name: 'Ksenia', tags: ['a', 'b'] });
    assert.equal(backend.getItem('dslkit.user'), '{"name":"Ksenia","tags":["a","b"]}');
  });

  it('round-trips primitive values', () => {
    const storage = createStorage(createMemoryBackend());
    storage.set('count', 3);
    storage.set('flag', false);
    storage.set('nothing', null);
    assert.equal(storage.get('count'), 3);
    assert.equal(storage.get('flag', true), false);
    assert.equal(storage.get('nothing', 'fallback'), null);
  });

  it('returns the fallback when stored JSON is invalid', () => {
    const backend = createMemoryBackend();
    backend.setItem('dslkit.broken', '{not json');
    const storage = createStorage(backend);
    assert.equal(storage.get('broken', 'safe'), 'safe');
  });

  it('uses a custom prefix and isolates keys between prefixes', () => {
    const backend = createMemoryBackend();
    const first = createStorage(backend, 'app-a.');
    const second = createStorage(backend, 'app-b.');
    first.set('theme', 'dark');
    assert.equal(second.get('theme'), null);
    assert.equal(first.get('theme'), 'dark');
    assert.equal(backend.getItem('app-a.theme'), '"dark"');
  });

  it('returns false when setItem throws (quota or security error)', () => {
    const storage = createStorage(
      throwingBackend({
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
      }),
    );
    assert.equal(storage.set('key', 'value'), false);
  });

  it('returns false when JSON.stringify fails on the value', () => {
    const storage = createStorage(createMemoryBackend());
    const circular = {};
    circular.self = circular;
    assert.equal(storage.set('loop', circular), false);
  });

  it('returns the fallback when getItem throws', () => {
    const storage = createStorage(
      throwingBackend({
        getItem: () => {
          throw new Error('SecurityError');
        },
      }),
    );
    assert.equal(storage.get('key', 'fallback'), 'fallback');
  });

  it('removes a key and returns true', () => {
    const backend = createMemoryBackend();
    const storage = createStorage(backend);
    storage.set('gone', 1);
    assert.equal(storage.remove('gone'), true);
    assert.equal(storage.get('gone', 'none'), 'none');
    assert.equal(backend.getItem('dslkit.gone'), null);
  });

  it('returns false when removeItem throws', () => {
    const storage = createStorage(
      throwingBackend({
        removeItem: () => {
          throw new Error('SecurityError');
        },
      }),
    );
    assert.equal(storage.remove('key'), false);
  });
});

describe('getStorage', () => {
  it('uses window.localStorage when it works', () => {
    const backend = createMemoryBackend();
    const win = { localStorage: backend };
    const storage = getStorage(win);
    assert.equal(storage.set('lang', 'ru'), true);
    assert.equal(backend.getItem('dslkit.lang'), '"ru"');
    assert.equal(storage.get('lang'), 'ru');
  });

  it('falls back to memory when localStorage is undefined', () => {
    const storage = getStorage({});
    assert.equal(storage.set('name', 'DSLKit'), true);
    assert.equal(storage.get('name'), 'DSLKit');
  });

  it('falls back to memory when localStorage is null', () => {
    const storage = getStorage({ localStorage: null });
    assert.equal(storage.set('count', 2), true);
    assert.equal(storage.get('count'), 2);
  });

  it('falls back to memory when the localStorage getter throws', () => {
    const win = {
      get localStorage() {
        throw new Error('SecurityError: access denied');
      },
    };
    const storage = getStorage(win);
    assert.equal(storage.set('mode', 'private'), true);
    assert.equal(storage.get('mode'), 'private');
  });

  it('works with the default window argument', () => {
    const storage = getStorage();
    assert.equal(typeof storage.get, 'function');
    assert.equal(typeof storage.set, 'function');
    assert.equal(typeof storage.remove, 'function');
  });
});
