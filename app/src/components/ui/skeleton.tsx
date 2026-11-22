import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'bg-border/70 animate-pulse rounded-md motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  );
}
