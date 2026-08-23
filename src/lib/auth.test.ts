import { describe, expect, it } from 'vitest';

import { buildAuthOptions } from '@/lib/auth';

describe('buildAuthOptions', () => {
  it('registers Google from runtime credentials', () => {
    const options = buildAuthOptions({
      NODE_ENV: 'production',
      BETTER_AUTH_SECRET: 'runtime-auth-secret',
      BETTER_AUTH_URL: 'https://rolepatch.com',
      GOOGLE_CLIENT_ID: 'runtime-client-id',
      GOOGLE_CLIENT_SECRET: 'runtime-client-secret',
    });

    expect(options.secret).toBe('runtime-auth-secret');
    expect(options.baseURL).toBe('https://rolepatch.com');
    expect(options.socialProviders).toEqual({
      google: {
        clientId: 'runtime-client-id',
        clientSecret: 'runtime-client-secret',
      },
    });
    expect(options.trustedOrigins).toEqual(['https://rolepatch.com']);
  });

  it('does not invent production credentials when Google is not configured', () => {
    const options = buildAuthOptions({
      NODE_ENV: 'production',
      BETTER_AUTH_URL: 'https://rolepatch.com',
    });

    expect(options.secret).toBeUndefined();
    expect(options.socialProviders).toEqual({});
  });
});
