import { describe, it, expect } from 'vitest';
import { safeNextPath } from './safe-redirect';

describe('safeNextPath — open-redirect guard', () => {
  it('allows ordinary same-origin paths', () => {
    expect(safeNextPath('/')).toBe('/');
    expect(safeNextPath('/account')).toBe('/account');
    expect(safeNextPath('/rooms/markets?tab=1')).toBe('/rooms/markets?tab=1');
  });

  it('rejects protocol-relative // and falls back to /', () => {
    expect(safeNextPath('//evil.com')).toBe('/');
    expect(safeNextPath('//evil.com/path')).toBe('/');
  });

  it('rejects backslash protocol-relative /\\ (browsers normalize \\ to /)', () => {
    expect(safeNextPath('/\\evil.com')).toBe('/');
    expect(safeNextPath('/\\/evil.com')).toBe('/');
  });

  it('rejects control-char smuggling (tab/newline strip to re-expose //)', () => {
    expect(safeNextPath('/\t//evil.com')).toBe('/');
    expect(safeNextPath('/\n//evil.com')).toBe('/');
  });

  it('rejects absolute and scheme URLs (do not start with /)', () => {
    expect(safeNextPath('https://evil.com')).toBe('/');
    expect(safeNextPath('http://evil.com')).toBe('/');
    expect(safeNextPath('javascript:alert(1)')).toBe('/');
    expect(safeNextPath('evil.com')).toBe('/');
  });

  it('rejects empty / null / undefined', () => {
    expect(safeNextPath('')).toBe('/');
    expect(safeNextPath(null)).toBe('/');
    expect(safeNextPath(undefined)).toBe('/');
  });
});
