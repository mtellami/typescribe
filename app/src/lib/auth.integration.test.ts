// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest';
import { betterAuth, getAuthStateVerificationIdentifier } from 'better-auth';
import { eq } from 'drizzle-orm';
import { auth } from './auth';
import { db, pool } from '@/db/client';
import { user, verification } from '@/db/auth-schema';

const email = `typescribe-test-${crypto.randomUUID()}@example.com`;
const password = 'Initial-password-123';
const newPassword = 'Changed-password-456';
const origin = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
const oauthStates: string[] = [];

async function call(path: string, body?: object, cookie?: string) {
  return auth.handler(
    new Request(`${origin}/api/auth/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        origin,
        'Content-Type': 'application/json',
        ...(cookie ? { cookie } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
  );
}

function cookies(response: Response) {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ');
}

afterAll(async () => {
  await db.delete(user).where(eq(user.email, email));
  for (const state of oauthStates) {
    await db
      .delete(verification)
      .where(
        eq(verification.identifier, getAuthStateVerificationIdentifier(state)),
      );
  }
  await pool.end();
});

describe('email/password accounts (PostgreSQL integration)', () => {
  it('creates an account, protects credentials, manages sessions and updates profile/password', async () => {
    const signup = await call('sign-up/email', {
      name: 'Test User',
      email,
      password,
    });
    expect(signup.status).toBe(200);
    const signupBody = await signup.json();
    expect(signupBody.user.email).toBe(email);
    expect(signupBody.user).not.toHaveProperty('password');
    const firstCookie = cookies(signup);
    expect(firstCookie).toContain('session_token=');

    const login = await call('sign-in/email', { email, password });
    expect(login.status).toBe(200);
    let currentCookie = cookies(login);
    const current = await call('get-session', undefined, currentCookie);
    expect((await current.json()).user.email).toBe(email);

    const updated = await call(
      'update-user',
      { name: 'Updated User' },
      currentCookie,
    );
    expect(updated.status).toBe(200);
    const profile = await call('get-session', undefined, currentCookie);
    expect((await profile.json()).user.name).toBe('Updated User');

    const denied = await call(
      'change-password',
      { currentPassword: 'wrong-password', newPassword },
      currentCookie,
    );
    expect(denied.ok).toBe(false);
    const changed = await call(
      'change-password',
      { currentPassword: password, newPassword, revokeOtherSessions: true },
      currentCookie,
    );
    expect(changed.status).toBe(200);
    if (cookies(changed)) currentCookie = cookies(changed);
    const revoked = await call('get-session', undefined, firstCookie);
    expect(await revoked.json()).toBeNull();

    const logout = await call('sign-out', {}, currentCookie);
    expect(logout.status).toBe(200);
    const signedOut = await call('get-session', undefined, currentCookie);
    expect(await signedOut.json()).toBeNull();
    const oldPassword = await call('sign-in/email', { email, password });
    expect(oldPassword.status).toBe(401);
    const newLogin = await call('sign-in/email', {
      email,
      password: newPassword,
    });
    expect(newLogin.status).toBe(200);
  });
});

describe('Google OAuth redirect (PostgreSQL integration)', () => {
  const googleAuth = betterAuth({
    ...auth.options,
    baseURL: origin,
    // Better Auth skips origin checks by default under NODE_ENV=test.
    advanced: {
      disableOriginCheck: false,
      disableCSRFCheck: false,
    },
    socialProviders: {
      google: {
        clientId: 'test-client.apps.googleusercontent.com',
        clientSecret: 'test-client-secret',
      },
    },
  });

  function start(callbackURL: string) {
    return googleAuth.handler(
      new Request(`${origin}/api/auth/sign-in/social`, {
        method: 'POST',
        headers: { origin, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'google',
          callbackURL,
          errorCallbackURL: '/login?error=oauth',
        }),
      }),
    );
  }

  it('creates a Google authorization URL with the correct callback and PKCE/state protection', async () => {
    const response = await start('/');
    expect(response.status).toBe(200);
    const body = await response.json();
    const url = new URL(body.url);
    const state = url.searchParams.get('state');
    if (state) oauthStates.push(state);
    expect(url.origin).toBe('https://accounts.google.com');
    expect(url.searchParams.get('client_id')).toBe(
      'test-client.apps.googleusercontent.com',
    );
    expect(url.searchParams.get('redirect_uri')).toBe(
      `${origin}/api/auth/callback/google`,
    );
    expect(url.searchParams.get('state')).toBeTruthy();
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('scope')).toContain('email');
    expect(url.searchParams.has('client_secret')).toBe(false);
    expect(response.headers.getSetCookie().length).toBeGreaterThan(0);
  });

  it('rejects a callback to an untrusted site', async () => {
    const response = await start('https://untrusted.example/');
    expect(response.status).toBe(403);
  });
});
