import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AppShell } from '@/components/layout/AppShell';
import { SettingsPanel } from '@/components/auth/SettingsPanel';

export default async function SettingsPage() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) redirect('/login');
  const accounts = await auth.api.listUserAccounts({ headers: requestHeaders });
  return (
    <AppShell>
      <SettingsPanel
        name={session.user.name}
        email={session.user.email}
        hasPassword={accounts.some(
          (account) => account.providerId === 'credential',
        )}
      />
    </AppShell>
  );
}
