'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { BookOpen, LogOut, Settings2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

export function AccountNav() {
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error('Sign out failed');
      window.location.assign('/');
    } catch {
      toast.error('Could not log out. Please try again.');
      setSigningOut(false);
    }
  }

  if (isPending)
    return (
      <div role="status" aria-label="Loading user menu">
        <Skeleton className="size-9 rounded-full" />
        <span className="sr-only">Loading user menu</span>
      </div>
    );
  if (!session)
    return (
      <Link
        href="/login"
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        Log in
      </Link>
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          aria-label="User menu"
          disabled={signingOut}
        >
          <UserRound className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="min-w-0 px-2 py-2">
          <p className="text-foreground truncate font-medium">
            {session.user.name}
          </p>
          <p className="text-muted-foreground truncate text-xs font-normal">
            {session.user.email}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          asChild
          className="hover:bg-primary/10 hover:text-primary data-highlighted:bg-primary/10 data-highlighted:text-primary cursor-pointer px-2 py-2 transition-colors"
        >
          <Link
            href="/library"
            aria-current={pathname === '/library' ? 'page' : undefined}
          >
            <BookOpen />
            Library
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          asChild
          className="hover:bg-primary/10 hover:text-primary data-highlighted:bg-primary/10 data-highlighted:text-primary cursor-pointer px-2 py-2 transition-colors"
        >
          <Link
            href="/settings"
            aria-current={pathname === '/settings' ? 'page' : undefined}
          >
            <Settings2 />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={signingOut}
          onSelect={() => void signOut()}
        >
          <LogOut />
          {signingOut ? 'Logging out…' : 'Log out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
