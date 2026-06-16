import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { enabledMethods, isMethodEnabled } from './auth-methods';

describe('auth-methods capability flags', () => {
  const KEY = 'NEXT_PUBLIC_AUTH_METHODS';
  let saved: string | undefined;
  beforeEach(() => {
    saved = process.env[KEY];
    delete process.env[KEY];
  });
  afterEach(() => {
    if (saved === undefined) delete process.env[KEY];
    else process.env[KEY] = saved;
  });

  it('defaults to the free, ready set (google, email, passkey) when unset', () => {
    expect([...enabledMethods()].sort()).toEqual(['email', 'google', 'passkey']);
    expect(isMethodEnabled('apple')).toBe(false);
    expect(isMethodEnabled('phone')).toBe(false);
  });

  it('honors an explicit list', () => {
    process.env[KEY] = 'google,apple,phone';
    expect([...enabledMethods()].sort()).toEqual(['apple', 'google', 'phone']);
    expect(isMethodEnabled('apple')).toBe(true);
    expect(isMethodEnabled('email')).toBe(false);
  });

  it('is tolerant of spaces, case, and unknown tokens', () => {
    process.env[KEY] = ' Google , APPLE , nonsense ,passkey';
    expect([...enabledMethods()].sort()).toEqual(['apple', 'google', 'passkey']);
  });

  it('falls back to the default set when the list is empty/all-invalid', () => {
    process.env[KEY] = ' , , ';
    expect([...enabledMethods()].sort()).toEqual(['email', 'google', 'passkey']);
  });
});
