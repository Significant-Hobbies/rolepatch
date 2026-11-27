import { ResumeBuilder } from '@/components/resume-builder';
import { listResumes } from '@/lib/actions/resume-actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Resume Builder' };

export default async function ResumeBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ resume?: string | string[] }>;
}) {
  const [resumes, params] = await Promise.all([listResumes(), searchParams]);
  return (
    <ResumeBuilder
      serverResumes={resumes}
      requestedResume={typeof params.resume === 'string' ? params.resume : undefined}
    />
  );
}
