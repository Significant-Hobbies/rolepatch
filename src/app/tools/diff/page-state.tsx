'use client';

import { DiffToolPageView } from './page-view';

import { useState } from 'react';

export function useDiffToolPageSourceState() {
  const [versionA, setVersionA] = useState('');
  const [versionB, setVersionB] = useState('');
  const [compared, setCompared] = useState(false);
  const [splitView, setSplitView] = useState(true);

  const canCompare = versionA.trim().length > 0 && versionB.trim().length > 0;

  const aLines = versionA.split('\n');
  const bLines = versionB.split('\n');
  const additions = compared ? bLines.filter((l, i) => l !== aLines[i]).length : 0;
  const removals = compared ? aLines.filter((l, i) => l !== bLines[i]).length : 0;

  return {
    versionA,
    setVersionA,
    setCompared,
    versionB,
    setVersionB,
    canCompare,
    compared,
    additions,
    removals,
    setSplitView,
    splitView,
  };
}

export default function DiffToolPage() {
  return <DiffToolPageView {...useDiffToolPageSourceState()} />;
}
