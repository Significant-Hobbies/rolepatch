'use client';

import '@saas-maker/feedback/dist/index.css';

import { FeedbackWidget, type FeedbackSubmission } from '@saas-maker/feedback';
import foundry from '../../foundry.json';
import { submitSaaSMakerFeedback } from '@/lib/saasmaker-feedback';

function submitFeedback(submission: FeedbackSubmission) {
  return submitSaaSMakerFeedback(submission, foundry.projectKey);
}

export default function SaaSMakerFeedbackWidget() {
  return (
    <FeedbackWidget
      onSubmit={submitFeedback}
      position="bottom-right"
      theme="dark"
      triggerText="Send feedback"
    />
  );
}
