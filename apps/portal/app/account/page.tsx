import { redirect } from 'next/navigation';
import { isSupabaseConfigured } from '../../lib/supabase/config';
import { createClient } from '../../lib/supabase/server';
import { TwoFactorCard } from '../../components/account/TwoFactorCard';
import { PasskeysCard } from '../../components/account/PasskeysCard';
import { AccountMethods } from '../../components/account/AccountMethods';
import { StepUpChallenge } from '../../components/account/StepUpChallenge';

export const metadata = { title: 'Security — Lar' };

/**
 * /account — the signed-in security surface. Server Component: gates with getClaims()
 * (never getSession on the server) and fetches the read-only snapshot, then hands it to
 * client cards that own their own mutations (enroll/register/sign-out). Inert until armed:
 * redirects to /login when unconfigured or unauthenticated.
 */
export default async function AccountSecurityPage() {
  if (!isSupabaseConfigured()) redirect('/login');

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims || typeof claims.sub !== 'string') redirect('/login');

  const [identitiesRes, factorsRes, aalRes] = await Promise.all([
    supabase.auth.getUserIdentities(),
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);

  // Enrolled but this session hasn't stepped up → require the 2FA code before any control.
  const needsStepUp = aalRes.data?.currentLevel === 'aal1' && aalRes.data?.nextLevel === 'aal2';

  // Minimal, serializable props (client components can't take SDK types).
  const connectedProviders = (identitiesRes.data?.identities ?? []).map((i) => i.provider);
  const totpFactors = (factorsRes.data?.totp ?? []).map((f) => ({
    id: f.id,
    friendlyName: f.friendly_name ?? 'Authenticator app',
  }));
  const email = typeof claims.email === 'string' ? claims.email : undefined;

  return (
    <main
      style={{
        position: 'relative',
        zIndex: 2,
        minHeight: '100dvh',
        overflowY: 'auto',
        display: 'flex',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <section
        style={{
          width: 'min(620px, 94vw)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          padding: '40px 0 64px',
        }}
      >
        <div>
          <span className="eyebrow">Lar · Security</span>
          <h1 className="h1" style={{ fontSize: 30 }}>
            Your account
          </h1>
          <p className="lead" style={{ marginBottom: 8 }}>
            {email ? `Signed in as ${email}.` : 'Signed in.'} Manage how you sign in and keep your
            space secure.
          </p>
        </div>

        {needsStepUp ? (
          <StepUpChallenge />
        ) : (
          <>
            <TwoFactorCard initialFactors={totpFactors} />
            <PasskeysCard />
            <AccountMethods connectedProviders={connectedProviders} />
          </>
        )}
      </section>
    </main>
  );
}
