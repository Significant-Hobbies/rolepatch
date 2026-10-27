'use client';

import { BulletCheckPageView } from './page-view';

import { useMemo, useState } from 'react';

import { PLACEHOLDER, analyzeBullet } from './analysis';

export function useBulletCheckPageSourceState() {
  const [text, setText] = useState(PLACEHOLDER);

  const bullets = useMemo(() => {
    return text
      .split(/\n+/)
      .map((line) => line.replace(/^[-•*\s]+/, '').trim())
      .filter((line) => line.length > 0)
      .map(analyzeBullet);
  }, [text]);

  const avg =
    bullets.length === 0
      ? 0
      : Math.round(bullets.reduce((s, b) => s + b.score, 0) / bullets.length);

  return { text, setText, bullets, avg };
}

export default function BulletCheckPage() {
  return <BulletCheckPageView {...useBulletCheckPageSourceState()} />;
}
