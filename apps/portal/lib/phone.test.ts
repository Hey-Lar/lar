import { describe, it, expect } from 'vitest';
import { toE164 } from './phone';

describe('toE164 — phone normalization', () => {
  it('accepts and canonicalizes well-formed numbers', () => {
    expect(toE164('+15551234567')).toBe('+15551234567');
    expect(toE164('+1 (555) 123-4567')).toBe('+15551234567');
    expect(toE164('  +44 7911 123456 ')).toBe('+447911123456');
  });

  it('rejects numbers without an explicit + / country code', () => {
    expect(toE164('5551234567')).toBeNull();
    expect(toE164('(555) 123-4567')).toBeNull();
  });

  it('rejects a country code starting with 0', () => {
    expect(toE164('+0123456789')).toBeNull();
  });

  it('rejects too-short / empty / junk', () => {
    expect(toE164('+12345')).toBeNull();
    expect(toE164('+')).toBeNull();
    expect(toE164('')).toBeNull();
    expect(toE164('not a phone')).toBeNull();
  });

  it('rejects too-long (> 15 digits)', () => {
    expect(toE164('+1234567890123456')).toBeNull();
  });
});
