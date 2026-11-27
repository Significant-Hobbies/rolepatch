const DEFAULT_WORKSPACE_PATH = '/resume-builder';

const workspacePath =
  /^\/(resume-builder|jobs|history|dashboard|editor|tailor|cover-letter|interview-prep|settings)(\/|$)/;

export function isWorkspacePath(pathname: string): boolean {
  return workspacePath.test(pathname);
}

export function workspaceReturnPath(value: string | string[] | undefined): string {
  if (typeof value !== 'string' || !isWorkspacePath(value.split(/[?#]/, 1)[0])) {
    return DEFAULT_WORKSPACE_PATH;
  }
  const origin = 'https://rolepatch.com';
  const target = new URL(value, origin);
  if (target.origin !== origin || !isWorkspacePath(target.pathname)) {
    return DEFAULT_WORKSPACE_PATH;
  }
  return target.pathname + target.search + target.hash;
}
