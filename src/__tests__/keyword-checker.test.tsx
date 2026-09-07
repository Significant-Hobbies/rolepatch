import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import KeywordsToolPage from '@/app/tools/keywords/page';
import { calculateATSScore } from '@/lib/ats-score';

describe('public keyword coverage', () => {
  it('shows the matched fraction instead of the weighted ATS heuristic and clears stale results', () => {
    const resume = 'React';
    const jd = 'React React Python Docker Rust Kotlin';
    const result = calculateATSScore(resume, jd);
    const coverage = Math.round((result.matchedKeywords.length / result.totalKeywords) * 100);
    expect(result.score).not.toBe(coverage);
    render(<KeywordsToolPage />);
    const resumeInput = screen.getByPlaceholderText('Paste your resume text here...');
    fireEvent.change(resumeInput, { target: { value: resume } });
    fireEvent.change(screen.getByPlaceholderText('Paste the job description here...'), {
      target: { value: jd },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }));
    expect(screen.getByText(`${coverage}%`)).toBeInTheDocument();
    expect(
      screen.getByText(
        `${result.matchedKeywords.length} of ${result.totalKeywords} keywords matched`
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('ATS Score')).not.toBeInTheDocument();
    expect(screen.getByText(/does not predict an/)).toBeInTheDocument();
    fireEvent.change(resumeInput, { target: { value: 'Updated experience' } });
    expect(screen.queryByText(`${coverage}%`)).not.toBeInTheDocument();
  });

  it('does not present a percentage when the job description has no usable terms', () => {
    render(<KeywordsToolPage />);
    fireEvent.change(screen.getByPlaceholderText('Paste your resume text here...'), {
      target: { value: 'React' },
    });
    fireEvent.change(screen.getByPlaceholderText('Paste the job description here...'), {
      target: { value: 'the and of' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }));
    expect(
      screen.getByText('No usable keywords found in this job description.')
    ).toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });
});
