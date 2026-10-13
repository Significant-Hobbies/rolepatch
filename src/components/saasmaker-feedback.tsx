'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import styles from './saasmaker-feedback.module.css';

function FeedbackPlaceholder() {
  return (
    <button disabled className={styles.trigger}>
      Send feedback
    </button>
  );
}

const FeedbackWidget = dynamic(() => import('./saasmaker-feedback-widget'), {
  ssr: false,
  loading: FeedbackPlaceholder,
});

export function SaaSMakerFeedback() {
  const section = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!section.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: '200px' }
    );
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={section}
      aria-labelledby="rolepatch-feedback-title"
      className={`${styles.support} mx-auto mb-6 flex max-w-6xl flex-col gap-4 rounded-xl border border-border/60 p-5 sm:flex-row sm:items-center sm:justify-between`}
    >
      <div className="min-w-0">
        <h2 id="rolepatch-feedback-title" className="font-semibold text-foreground">
          Help shape RolePatch.
        </h2>
        <p className="mt-1 text-sm text-foreground/75">
          Have a question or an idea? Send us feedback.
        </p>
      </div>
      {visible ? <FeedbackWidget /> : <FeedbackPlaceholder />}
    </section>
  );
}
