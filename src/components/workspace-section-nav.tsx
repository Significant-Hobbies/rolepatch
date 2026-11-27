import { Button } from '@saas-maker/ui/components/button';
import Link from 'next/link';

export function WorkspaceSectionNav({
  label,
  items,
  current,
  resumeId,
}: {
  label: string;
  items: readonly { href: string; label: string }[];
  current: string;
  resumeId?: string;
}) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1 border-b pb-2">
      {items.map(({ href, label }) => (
        <Button
          key={href}
          asChild
          size="sm"
          variant={href === current ? 'secondary' : 'ghost'}
          className="min-h-10 px-2 text-xs sm:px-3 sm:text-sm"
        >
          <Link
            href={resumeId ? { pathname: href, query: { resume: resumeId } } : href}
            aria-current={href === current ? 'page' : undefined}
            prefetch={false}
          >
            {label}
          </Link>
        </Button>
      ))}
    </nav>
  );
}
