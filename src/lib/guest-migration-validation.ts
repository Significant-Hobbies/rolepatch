import { careerCredentialIssue } from '@/lib/career-data-privacy';
import type { Resume } from '@/lib/types';

/** Preflight the full set before sending guest masters or writing their related records. */
export function guestMasterIssue(resumes: readonly Pick<Resume, 'name' | 'source'>[]) {
  for (const [index, resume] of resumes.entries()) {
    const label = `Local resume ${index + 1}`;
    const issue =
      careerCredentialIssue(`${label} name`, resume.name) ??
      careerCredentialIssue(label, resume.source);
    if (issue)
      return `${issue} Your local data is intact. Edit the guest resume and retry the import.`;
  }
  return null;
}
