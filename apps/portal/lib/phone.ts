/**
 * toE164 — normalize user-typed phone input to strict E.164, or null if invalid.
 *
 * Supabase phone OTP requires E.164 (`+<countrycode><number>`), and the SAME string must
 * be used for signInWithOtp and verifyOtp. We strip formatting (spaces, dashes, parens),
 * require an explicit leading '+' (so a bare local number is rejected, not mis-sent), and
 * validate the canonical shape. Returns null on anything that isn't a clean E.164 number.
 */
export function toE164(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('+')) return null; // demand an explicit country code
  const digits = trimmed.replace(/\D/g, '');
  const e164 = `+${digits}`;
  return /^\+[1-9]\d{6,14}$/.test(e164) ? e164 : null;
}
