import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RolePatchMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground',
        className
      )}
    >
      <ArrowUpRight className="size-4" aria-hidden="true" />
    </span>
  );
}
