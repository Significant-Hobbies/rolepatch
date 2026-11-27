export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { ResumeEditor } from '@/components/resume-editor';
import { getResume } from '@/lib/actions/resume-actions';

import { requireWorkspaceSignIn, type WorkspaceSearchParams } from '@/lib/workspace-access';
import EditorLoading from './editor-loading';

export default async function EditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: WorkspaceSearchParams;
}) {
  const { id } = await params;
  await requireWorkspaceSignIn(`/editor/${encodeURIComponent(id)}`, searchParams);

  return (
    <Suspense fallback={<EditorLoading />}>
      <EditorContent id={id} />
    </Suspense>
  );
}

async function EditorContent({ id }: { id: string }) {
  const resume = await getResume(id);

  return (
    <div className="flex h-[calc(100svh-8.5rem)] overflow-hidden md:h-[calc(100svh-5rem)]">
      <ResumeEditor
        key={id}
        resumeId={id}
        initialSource={resume?.source ?? null}
        resumeName={resume?.name ?? null}
      />
    </div>
  );
}
