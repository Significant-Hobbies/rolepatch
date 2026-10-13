import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const posthog = vi.hoisted(() => ({ init: vi.fn(), capture: vi.fn() }));
vi.mock('posthog-js', () => ({ default: posthog }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Clarity on the Astro home', () => {
  function loader() {
    const source = readFileSync('landing-astro/src/pages/index.astro', 'utf8');
    const script = source.match(
      /<script is:inline>\s*(\(function\(c,l,a,r,i\)[\s\S]*?)<\/script>/
    )?.[1];
    if (!script) throw new Error('Missing home Clarity loader');
    const listeners = new Map<string, () => void>();
    const insertBefore = vi.fn();
    runInNewContext(script, {
      window: {},
      document: {
        createElement: () => ({}),
        getElementsByTagName: () => [{ parentNode: { insertBefore } }],
      },
      addEventListener: (event: string, callback: () => void) => listeners.set(event, callback),
      removeEventListener: (event: string) => listeners.delete(event),
      setTimeout,
    });
    return { listeners, insertBefore };
  }

  it('makes no request until 90 seconds without interaction', () => {
    const { insertBefore, listeners } = loader();
    vi.advanceTimersByTime(89_999);
    expect(insertBefore).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(insertBefore).toHaveBeenCalledTimes(1);
    expect(insertBefore.mock.calls[0][0]).toMatchObject({
      async: 1,
      src: 'https://www.clarity.ms/tag/y6buz6rkot',
    });
    expect(listeners.size).toBe(0);
  });

  it('loads on interaction once, including when the timer later fires', () => {
    const { insertBefore, listeners } = loader();
    listeners.get('pointerdown')?.();
    expect(insertBefore).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(90_000);
    expect(insertBefore).toHaveBeenCalledTimes(1);
    expect(listeners.size).toBe(0);
  });
});

it('queues analytics and crashes through startup, then initializes PostHog once at idle', async () => {
  vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
  let idle: (() => void) | undefined;
  const requestIdleCallback = vi.fn((callback: () => void) => {
    idle = callback;
    return 1;
  });
  vi.stubGlobal('requestIdleCallback', requestIdleCallback);
  const { getPostHog, installBrowserMonitoring, captureAuthFailure } = await import(
    '@/lib/foundry-monitoring'
  );
  const cleanup = installBrowserMonitoring();
  captureAuthFailure({ stage: 'signin', reason: 'test failure' });
  window.dispatchEvent(new ErrorEvent('error', { message: 'test crash' }));
  expect(posthog.init).not.toHaveBeenCalled();
  expect(posthog.capture).not.toHaveBeenCalled();
  window.dispatchEvent(new Event('load'));
  vi.advanceTimersByTime(4999);
  expect(requestIdleCallback).not.toHaveBeenCalled();
  expect(posthog.init).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(requestIdleCallback).toHaveBeenCalledTimes(1);
  expect(posthog.init).not.toHaveBeenCalled();
  idle?.();
  await getPostHog();
  expect(posthog.init).toHaveBeenCalledTimes(1);
  expect(posthog.capture.mock.calls.map(([event]) => event)).toEqual([
    'foundry_auth_failure',
    'foundry_page_crash',
  ]);
  cleanup();
  window.dispatchEvent(new ErrorEvent('error', { message: 'after cleanup' }));
  expect(posthog.capture).toHaveBeenCalledTimes(2);
});

it('defers page views after load when requestIdleCallback is unavailable', async () => {
  vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete');
  vi.stubGlobal('requestIdleCallback', undefined);
  Reflect.deleteProperty(window, 'requestIdleCallback');
  const { trackPageView } = await import('@/lib/analytics');
  const { getPostHog } = await import('@/lib/foundry-monitoring');
  trackPageView();
  await vi.dynamicImportSettled();
  expect(posthog.init).not.toHaveBeenCalled();
  await vi.runAllTimersAsync();
  await getPostHog();
  expect(posthog.init).toHaveBeenCalledTimes(1);
  expect(posthog.capture).toHaveBeenCalledWith('page_view', { project_id: 'resume-tailor' });
});
