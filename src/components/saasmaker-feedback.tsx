'use client';

import '@saas-maker/feedback/dist/index.css';

import { FeedbackWidget } from '@saas-maker/feedback';
import type { FeedbackSubmission } from '@saas-maker/feedback';
import foundry from '../../foundry.json';
import { submitSaaSMakerFeedback } from '@/lib/saasmaker-feedback';
import styles from './saasmaker-feedback.module.css';

function submitFeedback(submission: FeedbackSubmission) {
  return submitSaaSMakerFeedback(submission, foundry.projectKey);
}

export function SaaSMakerFeedback() {
  return (
    <section
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
      <FeedbackWidget
        onSubmit={submitFeedback}
        position="bottom-right"
        theme="dark"
        triggerText="Send feedback"
      />
    </section>
  );
}
