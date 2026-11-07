export const dynamic = 'force-dynamic';

import { ResumeEditor } from '@/components/resume-editor';
import { getResume } from '@/lib/actions/resume-actions';

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resume = await getResume(id);

  return (
    <div className="flex h-[calc(100svh-5rem)] overflow-hidden">
      <ResumeEditor
        resumeId={id}
        initialSource={resume?.source ?? null}
        resumeName={resume?.name ?? null}
      />
    </div>
  );
}
