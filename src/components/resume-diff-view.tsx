'use client';

import type { ComponentProps } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';

export function ResumeDiffView(
  props: Omit<ComponentProps<typeof ReactDiffViewer>, 'compareMethod'>
) {
  return <ReactDiffViewer {...props} compareMethod={DiffMethod.WORDS} />;
}
