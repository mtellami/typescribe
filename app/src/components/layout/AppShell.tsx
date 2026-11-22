import { SiteHeader } from './SiteHeader';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl min-w-0 flex-col px-5 sm:px-8">
      <SiteHeader />
      <main className="min-w-0 flex-1 py-6 sm:py-8">{children}</main>
      <footer className="text-muted-foreground mt-8 border-t py-5 text-xs">
        typescribe · Find your flow, one line at a time.
      </footer>
    </div>
  );
}
