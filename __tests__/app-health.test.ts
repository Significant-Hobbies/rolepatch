import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const health = vi.hoisted(() => ({
  record: vi.fn(),
  flush: vi.fn().mockResolvedValue(undefined),
  create: vi.fn(),
}));

vi.mock('@saas-maker/app-health', () => ({
  createAppHealthClient: health.create,
}));

import { observeRequest, trustedRouteTemplate } from '../app-health.mjs';

describe('App Health endpoint summaries', () => {
  beforeEach(() => {
    health.create.mockReturnValue({ record: health.record, flush: health.flush });
  });

  afterEach(() => {
    vi.clearAllMocks();
    health.flush.mockResolvedValue(undefined);
    health.create.mockReturnValue({ record: health.record, flush: health.flush });
  });

  it('maps only known route templates and drops unknown concrete paths', () => {
    expect(trustedRouteTemplate('/api/apply-agent/queue/secret-id')).toBe(
      '/api/apply-agent/queue/:id'
    );
    expect(trustedRouteTemplate('/tailor/owner-job-slug/')).toBe('/tailor/:jobId');
    expect(trustedRouteTemplate('/api/auth/sign-in/social')).toBe('/api/auth/:path*');
    expect(trustedRouteTemplate('/api/auth/')).toBeNull();
    expect(trustedRouteTemplate('/api/auth//unknown')).toBeNull();
    expect(trustedRouteTemplate('/api/unknown/secret-id')).toBeNull();
    expect(trustedRouteTemplate('/blog/owner-slug/extra')).toBeNull();
  });

  it('sends only the endpoint summary fields through the Worker SDK and waitUntil', () => {
    const waitUntil = vi.fn();
    const request = new Request(
      'https://rolepatch.com/api/apply-agent/queue/private-id?token=private-value',
      { method: 'POST' }
    );
    const response = new Response('private body', { status: 201 });

    observeRequest(request, response, 12.4, { APP_HEALTH_INGEST_KEY: 'test-key' }, { waitUntil });

    expect(health.create).toHaveBeenCalledWith({
      key: 'test-key',
      environment: 'production',
      endpoint: 'https://ingest.sassmaker.com/v1/ingest',
      runtime: 'worker',
      disableTimer: true,
    });
    expect(health.record).toHaveBeenCalledWith({
      method: 'POST',
      route: '/api/apply-agent/queue/:id',
      status_code: 201,
      duration_ms: 12,
    });
    expect(JSON.stringify(health.record.mock.calls)).not.toContain('private-id');
    expect(JSON.stringify(health.record.mock.calls)).not.toContain('private-value');
    expect(waitUntil).toHaveBeenCalledWith(expect.any(Promise));
  });

  it('keeps telemetry failures from changing request handling', () => {
    health.record.mockImplementation(() => {
      throw new Error('telemetry unavailable');
    });

    expect(() =>
      observeRequest(
        new Request('https://rolepatch.com/'),
        new Response(null, { status: 200 }),
        1,
        { APP_HEALTH_INGEST_KEY: 'test-key-failure' },
        { waitUntil: vi.fn() }
      )
    ).not.toThrow();
  });
});
