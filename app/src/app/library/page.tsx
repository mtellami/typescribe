import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AppShell } from '@/components/layout/AppShell';
import { LibraryView } from '@/components/watch/LibraryView';

export default async function LibraryPage() {
  if (!(await auth.api.getSession({ headers: await headers() })))
    redirect('/login');
  return (
    <AppShell>
      <LibraryView />
    </AppShell>
  );
}
