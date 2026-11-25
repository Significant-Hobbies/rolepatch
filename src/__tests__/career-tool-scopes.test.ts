import { describe, expect, it } from 'vitest';
import { careerWriteResult } from '@/lib/career-write-result';
import { careerToolScopes } from '@/lib/career-scopes';
import { RESUME_MCP_TOOLS } from '@/lib/resume-mcp';

describe('remote career tool authorization', () => {
  it('requires an explicit policy for each advertised tool and preserves the legacy grant', () => {
    const legacy = [
      'rolepatch_resume_profiles',
      'rolepatch_resolve_job',
      'rolepatch_tailor_resume',
      'rolepatch_render_resume_pdf',
    ];
    for (const tool of RESUME_MCP_TOOLS) {
      const scopes = careerToolScopes(tool.name, {});
      expect(scopes.length).toBeGreaterThan(0);
      expect(scopes.includes('resume')).toBe(legacy.includes(tool.name));
    }
    expect(() => careerToolScopes('unmapped', {})).toThrow();
  });
  it('returns only persisted IDs and revisions from writes, including bulk replays', () => {
    const changed = {
      ok: true,
      id: 'owned',
      revision: 2,
      profile: { source: 'private master' },
      markdown: 'private draft',
      record: { answer: 'private answer' },
    };
    expect(careerWriteResult(changed)).toEqual({ ok: true, id: 'owned', revision: 2 });
    expect(
      careerWriteResult({
        ok: true,
        outcomes: [changed, { ok: false, code: 'conflict', error: 'Read the current revision' }],
      })
    ).toEqual({
      ok: true,
      outcomes: [
        { ok: true, id: 'owned', revision: 2 },
        { ok: false, code: 'conflict', error: 'Read the current revision' },
      ],
    });
  });
  it('requires additional grants when a call reads sensitive answers, loads job context or saves a draft', () => {
    expect(careerToolScopes('rolepatch_profiles_get', { include_sensitive: true })).toEqual([
      'profile:read',
      'answers:sensitive',
    ]);
    expect(
      careerToolScopes('rolepatch_career_records_bulk_upsert', { include_sensitive: true })
    ).toEqual(['profile:write', 'answers:sensitive']);
    expect(
      careerToolScopes('rolepatch_generate_resume', {
        application_id: 'job',
        save_to_history: true,
      })
    ).toEqual(['resume:generate', 'profile:read', 'applications:read', 'materials:write']);
    expect(careerToolScopes('rolepatch_render_resume_pdf', { version_id: 'snapshot' })).toEqual([
      'materials:read',
    ]);
  });
});
