export const dynamic = 'force-dynamic';

import { getResume } from '@/lib/actions/resume-actions';
import { notFound } from 'next/navigation';
import { ResumeEditor } from '@/components/resume-editor';

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resume = await getResume(id);
  if (!resume) notFound();

  return (
    <>
      <style>{`nav { display: none !important; }`}</style>
      <div className="h-screen flex overflow-hidden">
        <ResumeEditor resumeId={resume.id} initialSource={resume.source} resumeName={resume.name} />
      </div>
    </>
  );
}
