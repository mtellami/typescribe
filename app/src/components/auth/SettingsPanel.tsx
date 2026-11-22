import { AccountForm } from './AccountForm';
import { PracticePreferences } from '@/components/watch/PracticePreferences';

export function SettingsPanel({
  name,
  email,
  hasPassword,
}: {
  name: string;
  email: string;
  hasPassword: boolean;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Manage your profile and make your practice feel right.
        </p>
      </div>
      <AccountForm
        embedded
        name={name}
        email={email}
        hasPassword={hasPassword}
      />
      <PracticePreferences />
    </div>
  );
}
