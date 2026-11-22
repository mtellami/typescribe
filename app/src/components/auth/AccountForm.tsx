'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AccountForm({
  name,
  email,
  hasPassword,
  embedded = false,
}: {
  name: string;
  email: string;
  hasPassword: boolean;
  embedded?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{
    error: boolean;
    message: string;
  } | null>(null);

  async function perform(
    action: () => Promise<{ error: { message?: string } | null }>,
    message: string,
    refresh = true,
  ) {
    if (pending) return;
    setPending(true);
    setFeedback(null);
    try {
      const result = await action();
      setFeedback({
        error: Boolean(result.error),
        message: result.error?.message ?? message,
      });
      if (!result.error && refresh) router.refresh();
      return !result.error;
    } catch {
      setFeedback({
        error: true,
        message: 'Could not connect. Please try again.',
      });
      return false;
    } finally {
      setPending(false);
    }
  }

  function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void perform(
      () => authClient.updateUser({ name: String(data.get('name')).trim() }),
      'Profile saved.',
    );
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const saved = await perform(
      () =>
        authClient.changePassword({
          currentPassword: String(data.get('currentPassword')),
          newPassword: String(data.get('newPassword')),
          revokeOtherSessions: true,
        }),
      'Password changed. Other sessions have been signed out.',
    );
    if (saved) form.reset();
  }

  async function signOut() {
    const success = await perform(
      () => authClient.signOut(),
      'Signed out.',
      false,
    );
    if (success) {
      window.location.assign('/');
    }
  }

  const Container = embedded ? 'div' : 'main';
  return (
    <Container
      className={
        embedded ? 'space-y-6' : 'mx-auto w-full max-w-lg space-y-8 px-6 py-12'
      }
    >
      {!embedded && (
        <>
          <Link href="/" className="text-primary text-lg font-semibold">
            typescribe.
          </Link>
          <h1 className="text-2xl font-semibold">Settings</h1>
        </>
      )}
      {feedback && (
        <p
          role={feedback.error ? 'alert' : 'status'}
          className={feedback.error ? 'text-error text-sm' : 'text-sm'}
        >
          {feedback.message}
        </p>
      )}
      <form onSubmit={updateProfile}>
        <fieldset disabled={pending} className="space-y-4">
          <legend className="mb-4 font-medium">Profile</legend>
          <div className="space-y-2">
            <Label htmlFor="account-email">Email</Label>
            <Input id="account-email" type="email" value={email} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-name">Name</Label>
            <Input
              id="account-name"
              name="name"
              defaultValue={name}
              autoComplete="name"
              required
              maxLength={100}
              pattern=".*\S.*"
            />
          </div>
          <Button type="submit">Save profile</Button>
        </fieldset>
      </form>
      {hasPassword ? (
        <form onSubmit={changePassword} className="border-t pt-6">
          <fieldset disabled={pending} className="space-y-4">
            <legend className="mb-4 font-medium">Change password</legend>
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
              />
            </div>
            <Button type="submit">Change password</Button>
          </fieldset>
        </form>
      ) : (
        <p className="text-muted-foreground border-t pt-6 text-sm">
          You sign in with Google. Manage your password in your Google account.
        </p>
      )}
      {!embedded && (
        <div className="flex items-center justify-between border-t pt-6">
          <Link href="/" className="text-muted-foreground text-sm underline">
            Back to practice
          </Link>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => void signOut()}
          >
            Log out
          </Button>
        </div>
      )}
    </Container>
  );
}
