import { describe, expect, it } from 'vitest';
import {
  appendMasterSection,
  buildMasterResume,
  emptyMasterResume,
  EMPTY_MASTER_TEMPLATE,
  masterResumeReadiness,
} from '@/lib/master-resume';
import { listResumePoints, setResumePointPinned } from '@/lib/resume-pins';
import { prepareResumePolicy } from '@/lib/resume-tailoring-policy';

describe('complete master onboarding', () => {
  it('preserves every entered point, multiple roles/projects and education without invented facts', () => {
    const source = buildMasterResume({
      fullName: 'Alex Morgan',
      contact: 'alex@example.com | London',
      experience: [
        {
          title: 'Engineer — Acme',
          details: '2024–Present',
          points: 'Built React screens.\n- Reduced latency from 600 to 60 ms.',
        },
        { title: 'Engineer — Widget', details: '2022–2024', points: 'Shipped the customer API.' },
      ],
      projects: [
        {
          title: 'Reader',
          details: 'React, TypeScript',
          points: 'Built a reading queue.\nAdded search.',
        },
        { title: 'Toolbox', details: '', points: 'Released a command-line tool.' },
      ],
      education: 'BSc Computer Science — Example University, 2022\nDiploma — Example School, 2018',
      skills: 'React, TypeScript',
    });
    expect(masterResumeReadiness(source)).toMatchObject({ ready: true, points: 6 });
    expect(() => prepareResumePolicy(source)).not.toThrow();
    expect(listResumePoints(source).map((point) => point.label)).toEqual([
      'Built React screens.',
      'Reduced latency from 600 to 60 ms.',
      'Shipped the customer API.',
      'Built a reading queue.',
      'Added search.',
      'Released a command-line tool.',
    ]);
    expect(source).toContain('Diploma — Example School, 2018');
    expect(source).not.toContain('## Summary');
    expect(source).not.toContain('your.email@example.com');
    expect(source).not.toContain('collaborat');
  });

  it('keeps drafts incomplete instead of presenting template facts as ready', () => {
    const source = buildMasterResume(emptyMasterResume());
    expect(source).toBe(EMPTY_MASTER_TEMPLATE);
    expect(masterResumeReadiness(source)).toMatchObject({
      ready: false,
      hasName: false,
      projects: false,
      education: false,
      points: 0,
    });
    expect(() => prepareResumePolicy(source)).toThrow(/project/);
  });

  it('appends missing facts without rewriting imported content or removing pins', () => {
    const base =
      '# Alex\n\n## Experience\n\n### Acme\n\n- Built React screens.\n- Released APIs.\n';
    const pinned = setResumePointPinned(base, listResumePoints(base)[0].id, true);
    const withProject = appendMasterSection(
      pinned,
      'Projects',
      'Released Reader.\nAdded search.',
      'Reader'
    );
    const complete = appendMasterSection(
      withProject,
      'Education',
      'BSc — Example University, 2022'
    );
    expect(complete.startsWith(pinned.trimEnd())).toBe(true);
    expect(listResumePoints(complete)[0].pinned).toBe(true);
    expect(masterResumeReadiness(complete).ready).toBe(true);
    expect(appendMasterSection(complete, 'Education', ' ')).toBe(complete);
  });

  it('treats headings and HTML typed into factual fields as literal text', () => {
    const data = emptyMasterResume();
    data.fullName = 'Alex <script>';
    data.projects[0] = { title: '# Education', details: '', points: '<img src=x>\n## Skills' };
    data.education = 'BSc';
    const source = buildMasterResume(data);
    expect(source).not.toContain('<script>');
    expect(source).toContain('### \\# Education');
    expect(source).toContain('- \\#\\# Skills');
  });
});
