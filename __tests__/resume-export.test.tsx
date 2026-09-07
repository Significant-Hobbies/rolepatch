import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocalResumeExport } from '@/components/local-resume-export';
import { buildResumeFile, exportLocalResume } from '@/lib/resume-download';
import { markdownToHtml } from '@/lib/resume-html';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('safe resume documents', () => {
  it('preserves candidate facts and excludes executable markup and external resources', () => {
    const html = markdownToHtml(
      '# Riley\n\n- Reduced p95 from 240 ms to 160 ms.\n\n<script>alert(1)</script>\n\n<img src="https://tracker.invalid/pixel" onerror="alert(1)">\n\n![avatar](https://tracker.invalid/a.png)\n\n[bad](javascript:alert%281%29)\n\n[site](https://example.com)'
    );
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelector('h1')?.textContent).toBe('Riley');
    expect(doc.querySelector('li')?.textContent).toBe('Reduced p95 from 240 ms to 160 ms.');
    expect(doc.querySelectorAll('script,img,iframe,object,embed').length).toBe(0);
    expect([...doc.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual([
      'https://example.com/',
    ]);
    expect(
      doc.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content')
    ).toContain("default-src 'none'");
  });

  it('rejects CSS breakout and nonfinite configuration while retaining useful defaults', () => {
    const html = markdownToHtml('# Riley', '</title><script>bad()</script>', {
      fontFamily: '</style><script>bad()</script>',
      fontSize: Number.NaN,
      lineHeight: Number.POSITIVE_INFINITY,
      margin: -100,
    });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelectorAll('script').length).toBe(0);
    expect(doc.querySelector('style')?.textContent).toContain('Charter');
    expect(doc.querySelector('style')?.textContent).toContain('10.5pt');
    expect(doc.querySelector('style')?.textContent).toContain('margin: 0.25in');
  });

  it('exports exact current Markdown and labels Word-compatible HTML honestly', () => {
    const source = '# Riley\n\n- Edited result — 240 ms to 160 ms.';
    expect(buildResumeFile(source, 'Riley tailored', 'txt')).toMatchObject({
      name: 'riley-tailored.txt',
      content: source,
    });
    const word = buildResumeFile(source, 'Riley tailored', 'doc');
    expect(word.name).toBe('riley-tailored.doc');
    expect(word.type).toContain('application/msword');
    expect(word.content).toContain('<h1>Riley</h1>');
  });
});

describe('local export interaction', () => {
  it('prints the latest edited source in a standalone window without network or storage writes', () => {
    vi.useFakeTimers();
    const write = vi.fn();
    const print = vi.fn();
    const preview = {
      opener: window,
      document: { open: vi.fn(), write, close: vi.fn() },
      focus: vi.fn(),
      closed: false,
      print,
      setTimeout: window.setTimeout,
    };
    vi.spyOn(window, 'open').mockReturnValue(preview as unknown as Window);
    const fetch = vi.spyOn(globalThis, 'fetch');
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const view = render(<LocalResumeExport source="# Original" name="Riley" />);
    view.rerender(<LocalResumeExport source="# Edited result" name="Riley" />);
    fireEvent.click(screen.getByText('Print / Save PDF'));
    expect(write.mock.calls[0][0]).toContain('<h1>Edited result</h1>');
    expect(write.mock.calls[0][0]).not.toContain('<h1>Original</h1>');
    expect(preview.opener).toBeNull();
    vi.runAllTimers();
    expect(print).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
  });

  it('explains blocked popups without changing the source', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    render(<LocalResumeExport source="# Riley" name="Riley" />);
    fireEvent.click(screen.getByText('Print / Save PDF'));
    expect(screen.getByRole('alert')).toHaveTextContent('Allow pop-ups for RolePatch');
  });

  it('does not open a print window for a local text download', () => {
    vi.useFakeTimers();
    const open = vi.spyOn(window, 'open');
    const create = vi.fn().mockReturnValue('blob:synthetic');
    vi.stubGlobal(
      'URL',
      class extends URL {
        static override createObjectURL = create;
        static override revokeObjectURL = vi.fn();
      }
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    exportLocalResume('# Riley', 'Riley', 'txt');
    expect(open).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledOnce();
    vi.runAllTimers();
    vi.unstubAllGlobals();
  });
});
