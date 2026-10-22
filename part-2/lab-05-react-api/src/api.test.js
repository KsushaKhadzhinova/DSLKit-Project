import { beforeEach, describe, expect, it, vi } from 'vitest';
import api, { addDiagram, deleteDiagram, errorMessage, fetchDiagrams, isCanceled, login, register, retryOptions, updateDiagram } from './api';

let sent;
const respond = (status = 200, data = {}) => {
  api.defaults.adapter = (config) => {
    sent = config;
    const response = { data, status, statusText: '', headers: {}, config };
    return status < 400 ? Promise.resolve(response) : Promise.reject(Object.assign(new Error('fail'), { config, response, isAxiosError: true }));
  };
};

beforeEach(() => {
  retryOptions.delayMs = 0;
  sent = undefined;
  respond();
});

describe('requests', () => {
  it('sends the saved token as a Bearer header', async () => {
    localStorage.setItem('token', 'abc');
    await fetchDiagrams();
    expect(sent.headers.Authorization).toBe('Bearer abc');
  });

  it('sends no Authorization header without a token', async () => {
    await fetchDiagrams();
    expect(sent.headers.Authorization).toBeUndefined();
  });

  it('builds the CRUD requests', async () => {
    await fetchDiagrams('ord');
    expect([sent.method, sent.url, sent.params]).toEqual(['get', '/diagrams', { search: 'ord' }]);
    await fetchDiagrams();
    expect(sent.params).toBeUndefined();
    await addDiagram({ title: 'a' });
    expect([sent.method, sent.url, sent.data]).toEqual(['post', '/diagrams', '{"title":"a"}']);
    await updateDiagram(5, { title: 'b' });
    expect([sent.method, sent.url]).toEqual(['put', '/diagrams/5']);
    await deleteDiagram(5);
    expect([sent.method, sent.url]).toEqual(['delete', '/diagrams/5']);
    await login('a@b.co', 'secret123');
    expect([sent.url, sent.data]).toEqual(['/auth/login', '{"email":"a@b.co","password":"secret123"}']);
    await register('a@b.co', 'secret123');
    expect(sent.url).toBe('/auth/register');
  });
});

describe('paging parameters', () => {
  it('sends limit and offset together with the search text, and omits an offset of 0', async () => {
    await fetchDiagrams('ord', undefined, { limit: 20, offset: 40 });
    expect(sent.params).toEqual({ search: 'ord', limit: 20, offset: 40 });
    await fetchDiagrams('', undefined, { limit: 20, offset: 0 });
    expect(sent.params).toEqual({ limit: 20 });
  });
});

describe('401 handling', () => {
  it('removes the token and announces the logout when a saved token is rejected', async () => {
    localStorage.setItem('token', 'old');
    const listener = vi.fn();
    window.addEventListener('auth:logout', listener);
    respond(401, { error: 'Invalid token' });
    await expect(fetchDiagrams()).rejects.toBeTruthy();
    expect(localStorage.getItem('token')).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('auth:logout', listener);
  });

  it('does not announce a logout for a failed login without a token', async () => {
    const listener = vi.fn();
    window.addEventListener('auth:logout', listener);
    respond(401, { error: 'Invalid email or password' });
    await expect(login('a@b.co', 'wrong-pass')).rejects.toBeTruthy();
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener('auth:logout', listener);
  });

  it('passes other errors through', async () => {
    respond(500, {});
    await expect(fetchDiagrams()).rejects.toMatchObject({ response: { status: 500 } });
  });
});

describe('errorMessage', () => {
  it('uses the server message and field details', () => {
    expect(errorMessage({ response: { status: 400, data: { error: 'Invalid', details: [{ field: 'title', message: 'empty' }] } } })).toBe(
      'Invalid – title: empty',
    );
  });
  it('falls back to the status when the body has no message', () => {
    expect(errorMessage({ response: { status: 502 } })).toBe('Ошибка сервера (502)');
  });
  it('describes a timeout and an unreachable server', () => {
    expect(errorMessage({ code: 'ECONNABORTED' })).toMatch(/не ответил вовремя/);
    expect(errorMessage({ code: 'ERR_NETWORK' })).toMatch(/Сервер недоступен/);
  });
  it('recognises a cancelled request', () => {
    expect(isCanceled(new Error('x'))).toBe(false);
  });
});

describe('storage and odd responses', () => {
  it('works without a token when the storage is blocked', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    await fetchDiagrams();
    expect(sent.headers.Authorization).toBeUndefined();
    spy.mockRestore();
  });
  it('does not break on an HTML error page from a proxy', () => {
    expect(errorMessage({ response: { status: 502, data: '<html>Bad gateway</html>' } })).toBe('Ошибка сервера (502)');
  });
});

describe('retry of the list request', () => {
  const sequence = (...results) => {
    let calls = 0;
    api.defaults.adapter = (config) => {
      const result = results[Math.min(calls, results.length - 1)];
      calls += 1;
      if (result === 'network') return Promise.reject(Object.assign(new Error('Network Error'), { config, isAxiosError: true }));
      const response = { data: [], status: result, statusText: '', headers: {}, config };
      return result < 400 ? Promise.resolve(response) : Promise.reject(Object.assign(new Error('fail'), { config, response, isAxiosError: true }));
    };
    return () => calls;
  };

  it('tries again after a 5xx answer and after a network failure, then succeeds', async () => {
    const calls = sequence(503, 'network', 200);
    await expect(fetchDiagrams()).resolves.toMatchObject({ status: 200 });
    expect(calls()).toBe(3);
  });

  it('gives up after the allowed number of attempts and reports the last error', async () => {
    const calls = sequence(500);
    await expect(fetchDiagrams()).rejects.toMatchObject({ response: { status: 500 } });
    expect(calls()).toBe(retryOptions.attempts);
  });

  it('does not repeat a 4xx answer', async () => {
    const calls = sequence(404, 200);
    await expect(fetchDiagrams()).rejects.toMatchObject({ response: { status: 404 } });
    expect(calls()).toBe(1);
  });

  it('does not repeat a cancelled request', async () => {
    const controller = new AbortController();
    const calls = sequence('network', 200);
    controller.abort();
    await expect(fetchDiagrams('', controller.signal)).rejects.toBeTruthy();
    expect(calls()).toBeLessThanOrEqual(1);
  });

  it('stops waiting between attempts when the request is cancelled', async () => {
    retryOptions.delayMs = 5000;
    const controller = new AbortController();
    const calls = sequence(500, 200);
    const result = fetchDiagrams('', controller.signal);
    setTimeout(() => controller.abort(), 20);
    await expect(result).rejects.toBeTruthy();
    expect(calls()).toBe(1);
  });

  it('writes and deletes are never repeated', async () => {
    const calls = sequence(500);
    await expect(addDiagram({ title: 'a' })).rejects.toBeTruthy();
    await expect(deleteDiagram(1)).rejects.toBeTruthy();
    expect(calls()).toBe(2);
  });
});
