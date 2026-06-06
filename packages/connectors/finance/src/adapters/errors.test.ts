import { describe, it, expect } from 'vitest';
import { BrokerError, DataError, num } from './errors';

describe('BrokerError', () => {
  it('sets name, message, broker, and code', () => {
    const err = new BrokerError('alpaca', 'rate-limit', 'too many requests');
    expect(err.name).toBe('BrokerError');
    expect(err.broker).toBe('alpaca');
    expect(err.code).toBe('rate-limit');
    expect(err.message).toBe('[alpaca:rate-limit] too many requests');
    expect(err).toBeInstanceOf(Error);
  });

  it('stores cause when provided', () => {
    const cause = new TypeError('inner');
    const err = new BrokerError('alpaca', 'upstream', 'failed', cause);
    expect(err.cause).toBe(cause);
  });

  it('cause is undefined when omitted', () => {
    const err = new BrokerError('alpaca', 'auth', 'unauthorized');
    expect(err.cause).toBeUndefined();
  });
});

describe('DataError', () => {
  it('sets name, message, provider, and code', () => {
    const err = new DataError('polygon', 'not-found', 'symbol XYZZ unknown');
    expect(err.name).toBe('DataError');
    expect(err.provider).toBe('polygon');
    expect(err.code).toBe('not-found');
    expect(err.message).toBe('[polygon:not-found] symbol XYZZ unknown');
    expect(err).toBeInstanceOf(Error);
  });

  it('stores cause when provided', () => {
    const cause = { statusCode: 404 };
    const err = new DataError('polygon', 'not-found', 'missing', cause);
    expect(err.cause).toBe(cause);
  });
});

describe('num()', () => {
  it('returns number values unchanged when finite', () => {
    expect(num(42)).toBe(42);
    expect(num(0)).toBe(0);
    expect(num(-1.5)).toBe(-1.5);
  });

  it('coerces string numbers', () => {
    expect(num('3.14')).toBe(3.14);
    expect(num('0')).toBe(0);
  });

  it('returns fallback for null / undefined / empty string / NaN', () => {
    expect(num(null)).toBe(0);
    expect(num(undefined)).toBe(0);
    expect(num('')).toBe(0);
    expect(num(NaN)).toBe(0);
    expect(num('not-a-number')).toBe(0);
  });

  it('respects a custom fallback', () => {
    expect(num(null, -1)).toBe(-1);
    expect(num(undefined, 99)).toBe(99);
  });

  it('returns fallback for Infinity', () => {
    expect(num(Infinity)).toBe(0);
    expect(num(-Infinity)).toBe(0);
  });
});
