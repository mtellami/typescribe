import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth, googleAuthEnabled } from '@/lib/auth';
import { AuthForm } from '@/components/auth/AuthForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  if (await auth.api.getSession({ headers: await headers() }))
    redirect('/settings');
  return (
    <AuthForm
      mode="login"
      googleEnabled={googleAuthEnabled}
      oauthError={Boolean((await searchParams).error)}
    />
  );
}
