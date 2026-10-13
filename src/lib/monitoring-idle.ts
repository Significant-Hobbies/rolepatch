'use client';

export function waitForMonitoringIdle() {
  const pending: Promise<void> = new Promise((resolve) => {
    const afterLoad = () => {
      setTimeout(() => {
        if ('requestIdleCallback' in window)
          window.requestIdleCallback(() => resolve(), { timeout: 1000 });
        else resolve();
      }, 5000);
    };
    if (document.readyState === 'complete') afterLoad();
    else window.addEventListener('load', afterLoad, { once: true });
  });
  return pending;
}
