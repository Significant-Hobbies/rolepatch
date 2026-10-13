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
    expect(deployWorkflow).toMatch(/versions upload --env="" --tag \$\{\{ github\.sha \}\}/);
    expect(deployWorkflow).toMatch(
      /WORKER_UPLOAD_OUTPUT: \$\{\{ steps\.upload\.outputs\.command-output \}\}/
    );
    expect(deployWorkflow).toMatch(
      /versions deploy --env="" \$\{\{ steps\.uploaded-version\.outputs\.version-id \}\}@100% --yes/
    );
    expect(deployWorkflow).not.toContain('--version-tag');
    expect(deployWorkflow).not.toMatch(
      /^[ \t]+(?:command: )?(?:wrangler )?(?:deploy|triggers deploy)(?:[ \t]|$)/m
    );
    expect(deployWorkflow).toContain('run: pnpm smoke:prod');
  });
});
