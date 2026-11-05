import { act, renderHook } from '@testing-library/react';
import { AUTOSAVE_DELAY, useAutosaveStatus } from './useAutosaveStatus';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  it('returns the initial value when storage is empty and saves it', () => {
    const { result } = renderHook(() => useLocalStorage('k', [1]));
    expect(result.current[0]).toEqual([1]);
    expect(JSON.parse(localStorage.getItem('k'))).toEqual([1]);
  });

  it('loads a stored value on mount', () => {
    localStorage.setItem('k', JSON.stringify({ a: 2 }));
    const { result } = renderHook(() => useLocalStorage('k', {}));
    expect(result.current[0]).toEqual({ a: 2 });
  });

  it('writes every change to storage', () => {
    const { result } = renderHook(() => useLocalStorage('k', 0));
    act(() => result.current[1](5));
    expect(localStorage.getItem('k')).toBe('5');
  });

  it('falls back to the initial value when the stored JSON is broken', () => {
    localStorage.setItem('k', '{broken');
    const { result } = renderHook(() => useLocalStorage('k', 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });
});

describe('useLocalStorage validation and errors', () => {
  it('uses the initial value when validate rejects the stored data', () => {
    localStorage.setItem('k', JSON.stringify({ a: 1 }));
    const { result } = renderHook(() => useLocalStorage('k', [], Array.isArray));
    expect(result.current[0]).toEqual([]);
  });

  it('repair keeps what can be saved from rejected data and null falls back to the initial value', () => {
    localStorage.setItem('k', JSON.stringify([1, 'x', 2]));
    const keep = renderHook(() => useLocalStorage('k', [], (v) => v.every(Number.isInteger), (v) => v.filter(Number.isInteger)));
    expect(keep.result.current[0]).toEqual([1, 2]);
    const none = renderHook(() => useLocalStorage('k', ['start'], () => false, () => null));
    expect(none.result.current[0]).toEqual(['start']);
  });

  it('does not throw when setItem fails', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const { result } = renderHook(() => useLocalStorage('k', 1));
    expect(result.current[0]).toBe(1);
    spy.mockRestore();
  });
});

describe('useAutosaveStatus', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('is saving right after a change and saved after the debounce delay', () => {
    const { result, rerender } = renderHook(({ v }) => useAutosaveStatus(v), { initialProps: { v: 1 } });
    expect(result.current).toBe('saving');
    act(() => vi.advanceTimersByTime(AUTOSAVE_DELAY));
    expect(result.current).toBe('saved');

    rerender({ v: 2 });
    expect(result.current).toBe('saving');
  });

  it('restarts the delay when the value changes again', () => {
    const { result, rerender } = renderHook(({ v }) => useAutosaveStatus(v), { initialProps: { v: 1 } });
    act(() => vi.advanceTimersByTime(AUTOSAVE_DELAY - 100));
    rerender({ v: 2 });
    act(() => vi.advanceTimersByTime(AUTOSAVE_DELAY - 100));
    expect(result.current).toBe('saving');
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe('saved');
  });
});
