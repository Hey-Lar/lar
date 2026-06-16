import { describe, it, expect } from 'vitest';
import { aalStepUpState, needsStepUp } from './mfa';

describe('aalStepUpState — Supabase AAL pair → UI state', () => {
  it('no session → unauthenticated', () => {
    expect(aalStepUpState(null, null)).toBe('unauthenticated');
    expect(aalStepUpState(undefined, 'aal1')).toBe('unauthenticated');
  });

  it('aal1 / aal1 → no_mfa (no verified factor)', () => {
    expect(aalStepUpState('aal1', 'aal1')).toBe('no_mfa');
  });

  it('aal1 / aal2 → needs_challenge (enrolled but session not stepped up)', () => {
    expect(aalStepUpState('aal1', 'aal2')).toBe('needs_challenge');
  });

  it('aal2 / aal2 → mfa_satisfied', () => {
    expect(aalStepUpState('aal2', 'aal2')).toBe('mfa_satisfied');
  });

  it('aal2 / aal1 → downgraded (factors were removed)', () => {
    expect(aalStepUpState('aal2', 'aal1')).toBe('downgraded');
  });

  it('treats unknown/missing nextLevel on an aal1 session as no_mfa', () => {
    expect(aalStepUpState('aal1', null)).toBe('no_mfa');
    expect(aalStepUpState('aal1', undefined)).toBe('no_mfa');
  });

  it('needsStepUp is true ONLY for needs_challenge', () => {
    expect(needsStepUp('needs_challenge')).toBe(true);
    for (const s of ['unauthenticated', 'no_mfa', 'mfa_satisfied', 'downgraded'] as const) {
      expect(needsStepUp(s)).toBe(false);
    }
  });
});
