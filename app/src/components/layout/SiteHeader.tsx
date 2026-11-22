import Link from 'next/link';
import { Keyboard } from 'lucide-react';
import { AccountNav } from '@/components/auth/AccountNav';

export function SiteHeader({
  compact = false,
  home = false,
  onHome,
}: {
  compact?: boolean;
  home?: boolean;
  onHome?: () => void;
}) {
  return (
    <header
      className={`flex shrink-0 items-center justify-between gap-4 border-b ${compact ? 'h-14' : home ? 'h-16' : 'min-h-20'}`}
    >
      <Link
        href="/"
        onClick={onHome}
        aria-label="Typescribe home"
        className="flex items-center gap-3"
      >
        <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
          <Keyboard className="size-5" />
        </span>
        <span className="text-lg font-semibold tracking-tight">
          typescribe<span className="text-primary">.</span>
        </span>
      </Link>
      <nav
        className="flex items-center gap-1 sm:gap-3"
        aria-label="Main navigation"
      >
        <AccountNav />
      </nav>
    </header>
  );
}
