import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Resume Tools — Structure, Keywords and Review',
  description:
    'Review one resume for one job with free text structure, keyword, bullet, diff and word-count tools. See what each check needs and where its limits are.',
  alternates: { canonical: 'https://rolepatch.com/tools' },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
