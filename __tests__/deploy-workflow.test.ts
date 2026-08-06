import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const deployWorkflow = readFileSync('.github/workflows/deploy.yml', 'utf8');

describe('deploy workflow', () => {
  it('builds pull requests and deploys only by manual SHA-tagged dispatch', () => {
    expect(deployWorkflow).not.toMatch(/\n\s+push:/);
    expect(deployWorkflow).not.toContain('branches: [main]');
    expect(deployWorkflow).toContain('pull_request:');
    expect(deployWorkflow).toContain('workflow_dispatch:');
    expect(deployWorkflow).toContain("if: github.event_name == 'workflow_dispatch'");
    expect(deployWorkflow).toContain('pnpm cf:build');
    // biome-ignore lint/suspicious/noTemplateCurlyInString: GitHub Actions expressions use this literal syntax.
    expect(deployWorkflow).toContain('command: deploy --tag ${{ github.sha }}');
    expect(deployWorkflow).toContain('run: pnpm smoke:prod');
  });
});
