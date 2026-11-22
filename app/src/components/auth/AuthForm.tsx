'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AuthForm({
  mode,
  googleEnabled = false,
  oauthError = false,
}: {
  mode: 'login' | 'signup';
  googleEnabled?: boolean;
  oauthError?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(
    oauthError
      ? 'Google sign-in was cancelled or could not be completed. Please try again.'
      : null,
  );
  const [googlePending, setGooglePending] = useState(false);
  const busy = pending || googlePending;
  const signup = mode === 'signup';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setError(null);
    setPending(true);
    try {
      const credentials = {
        email: String(form.get('email')).trim(),
        password: String(form.get('password')),
      };
      const result = signup
        ? await authClient.signUp.email({
            ...credentials,
            name: String(form.get('name')).trim(),
          })
        : await authClient.signIn.email(credentials);
      if (result.error) {
        setError(
          result.error.message ?? 'Unable to sign in. Please try again.',
        );
        return;
      }
      router.replace('/');
      router.refresh();
    } catch {
      setError('Could not connect. Please try again.');
    } finally {
      setPending(false);
    }
  }

  async function signInWithGoogle() {
    if (busy) return;
    setGooglePending(true);
    setError(null);
    try {
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/',
        errorCallbackURL: '/login?error=oauth',
      });
      if (result.error) {
        setError('Could not start Google sign-in. Please try again.');
        setGooglePending(false);
      }
    } catch {
      setError('Could not connect. Please try again.');
      setGooglePending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-6 py-12">
      <Link href="/" className="text-primary text-lg font-semibold">
        typescribe.
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">
          {signup ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Sign in to import videos and manage your account.
        </p>
      </div>
      {googleEnabled && (
        <div className="space-y-5">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => void signInWithGoogle()}
          >
            <Image
              src="/google-logo.png"
              alt=""
              width={18}
              height={18}
              className="shrink-0"
            />
            {googlePending ? 'Connecting to Google…' : 'Continue with Google'}
          </Button>
          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            <span className="bg-border h-px flex-1" />
            or continue with email
            <span className="bg-border h-px flex-1" />
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-error text-sm">
          {error}
        </p>
      )}
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={busy} className="space-y-4">
          {signup && (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                required
                maxLength={100}
                pattern=".*\S.*"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={signup ? 'new-password' : 'current-password'}
              required
              minLength={8}
              maxLength={128}
              aria-describedby={signup ? 'password-help' : undefined}
            />
            {signup && (
              <p id="password-help" className="text-muted-foreground text-xs">
                Use at least 8 characters.
              </p>
            )}
          </div>
          <Button className="w-full" type="submit">
            {pending ? 'Please wait…' : signup ? 'Create account' : 'Log in'}
          </Button>
        </fieldset>
      </form>
      <p className="text-muted-foreground text-sm">
        {signup ? 'Already have an account? ' : 'New to Typescribe? '}
        <Link
          href={signup ? '/login' : '/signup'}
          className="text-primary underline"
        >
          {signup ? 'Log in' : 'Create an account'}
        </Link>
      </p>
      <Link href="/" className="text-muted-foreground text-sm underline">
        Continue practicing as a guest
      </Link>
    </main>
  );
}
