#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(currentFile), '..');
const productionPaths = [
  'src',
  'scripts',
  'extension/src',
  'landing-astro/src',
  'worker.mjs',
  'next.config.ts',
  'open-next.config.ts',
  'vitest.config.ts',
];
const hygienePaths = [
  ...productionPaths,
  '.github',
  'PROJECT_STATUS.md',
  'biome.json',
  'extension/package.json',
  'extension/tsconfig.json',
  'landing-astro/package.json',
  'landing-astro/tsconfig.json',
  'knip.json',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'tsconfig.json',
];
const sourceExtensions = new Set(['.astro', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx']);
const baselines = {
  complexity: { violations: 72, maxCcn: 49, maxLength: 615, maxParams: 9 },
  duplication: {
    clones: 43,
    duplicatedLines: 716,
    percentage: 2.044254104211278,
  },
  unused: {
    files: 0,
    exports: 1,
    types: 0,
    dependencies: 1,
    devDependencies: 0,
    unlisted: 0,
    unresolved: 0,
  },
  suppressions: 13,
  dependencies: { critical: 0, highIds: 22, highFindings: 30 },
};
const acceptedUnusedDependencies = new Set([
  'landing-astro/package.json:@fontsource-variable/geist',
]);
const acceptedHighAdvisories = new Set([
  'GHSA-28wg-ghj8-5hjv',
  'GHSA-2p49-hgcm-8545',
  'GHSA-2pvr-wf23-7pc7',
  'GHSA-2v37-7h3g-55p8',
  'GHSA-4cwx-7wf7-3272',
  'GHSA-52cp-r559-cp3m',
  'GHSA-5p4m-2wfm-xmqj',
  'GHSA-6g55-p6wh-862q',
  'GHSA-7p8r-x3mc-p8w7',
  'GHSA-8hv8-536x-4wqp',
  'GHSA-96hv-2xvq-fx4p',
  'GHSA-9wv6-86v2-598j',
  'GHSA-f88m-g3jw-g9cj',
  'GHSA-hm92-r4w5-c3mj',
  'GHSA-jmr9-qjv8-65gv',
  'GHSA-mh99-v99m-4gvg',
  'GHSA-mwp4-54f8-5fhr',
  'GHSA-r28c-9q8g-f849',
  'GHSA-rgw5-rvv9-x895',
  'GHSA-rpmf-866q-6p89',
  'GHSA-vmh5-mc38-953g',
  'GHSA-vxpw-j846-p89q',
]);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    env: { ...process.env, ...(options.env ?? {}) },
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !options.allowFailure) {
    process.stdout.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
    throw new Error(`${command} exited with status ${result.status}`);
  }
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function parseJson(result, label) {
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    process.stderr.write(result.stderr);
    throw new Error(`${label} did not return valid JSON`, { cause: error });
  }
}

function commandWithUvx(command, uvxArgs) {
  const probe = spawnSync(command, ['--version'], { encoding: 'utf8' });
  return probe.status === 0 ? { command, prefix: [] } : { command: 'uvx', prefix: uvxArgs };
}

function issueCount(issues, key) {
  return issues.reduce((sum, issue) => sum + (issue[key]?.length ?? 0), 0);
}

function failRegressions(label, observed, baseline) {
  const regressions = Object.entries(baseline).filter(([key, maximum]) => observed[key] > maximum);
  if (regressions.length > 0) {
    throw new Error(
      regressions
        .map(([key, maximum]) => `${label} ${key} regressed: ${observed[key]} > ${maximum}`)
        .join('\n')
    );
  }
  if (Object.entries(baseline).some(([key, maximum]) => observed[key] < maximum)) {
    console.log(`${label} improved; lower the checked-in baseline intentionally.`);
  }
}

function checkUnused() {
  const report = parseJson(
    run('pnpm', ['exec', 'knip', '--reporter', 'json', '--no-exit-code', '--no-progress'], {
      allowFailure: true,
    }),
    'Knip'
  );
  const issues = report.issues ?? [];
  const observed = Object.fromEntries(
    Object.keys(baselines.unused).map((key) => [key, issueCount(issues, key)])
  );
  const unusedDependencies = issues.flatMap((issue) =>
    (issue.dependencies ?? []).map((dependency) => `${issue.file}:${dependency.name}`)
  );
  const unexpectedDependencies = unusedDependencies.filter(
    (dependency) => !acceptedUnusedDependencies.has(dependency)
  );
  console.log(
    `Unused: files=${observed.files}, exports=${observed.exports}, types=${observed.types}, ` +
      `dependencies=${observed.dependencies}, devDependencies=${observed.devDependencies}, ` +
      `unlisted=${observed.unlisted}, unresolved=${observed.unresolved}.`
  );
  if (unexpectedDependencies.length > 0) {
    throw new Error(`Unexpected unused dependencies: ${unexpectedDependencies.join(', ')}`);
  }
  failRegressions('Unused', observed, baselines.unused);
}

function checkComplexity() {
  const lizard = commandWithUvx('lizard', ['--from', 'lizard==1.23.0', 'lizard']);
  const result = run(lizard.command, [
    ...lizard.prefix,
    ...productionPaths,
    '-x',
    '**/*.test.*',
    '-x',
    '**/__tests__/**',
    '-x',
    'scripts/check-code-health.mjs',
    '-x',
    '**/*.d.ts',
    '--csv',
  ]);
  const rows = result.stdout
    .trim()
    .split('\n')
    .map((line) => line.match(/^(\d+),(\d+),(\d+),(\d+),(\d+),/u))
    .filter(Boolean)
    .map((match) => match.slice(1).map(Number));
  const observed = {
    functions: rows.length,
    nloc: rows.reduce((sum, row) => sum + row[0], 0),
    violations: rows.filter((row) => row[1] > 15 || row[4] > 100 || row[3] > 7).length,
    maxCcn: Math.max(0, ...rows.map((row) => row[1])),
    maxLength: Math.max(0, ...rows.map((row) => row[4])),
    maxParams: Math.max(0, ...rows.map((row) => row[3])),
  };
  console.log(
    `Complexity: ${observed.functions} functions, ${observed.nloc} NLOC, ` +
      `${observed.violations} violations; max CCN ${observed.maxCcn}, ` +
      `max length ${observed.maxLength}, max params ${observed.maxParams}.`
  );
  failRegressions('Complexity', observed, baselines.complexity);
}

function checkDuplication() {
  const outputDirectory = mkdtempSync(join(tmpdir(), 'rolepatch-jscpd-'));
  run('pnpm', [
    'exec',
    'jscpd',
    ...productionPaths,
    '--min-lines',
    '8',
    '--min-tokens',
    '60',
    '--mode',
    'strict',
    '--ignore',
    '**/*.test.*,**/__tests__/**,**/*.d.ts,**/node_modules/**,**/dist/**,**/coverage/**,scripts/check-code-health.mjs',
    '--reporters',
    'json',
    '--output',
    outputDirectory,
    '--silent',
    '--no-tips',
  ]);
  const observed = JSON.parse(readFileSync(join(outputDirectory, 'jscpd-report.json'), 'utf8'))
    .statistics.total;
  console.log(
    `Duplication: ${observed.clones} groups, ${observed.duplicatedLines}/${observed.lines} lines ` +
      `(${observed.percentage.toFixed(4)}%) across ${observed.sources} files.`
  );
  failRegressions('Duplication', observed, baselines.duplication);
}

function checkCycles() {
  const report = parseJson(
    run(
      'pnpm',
      ['exec', 'knip', '--cycles', '--reporter', 'json', '--no-exit-code', '--no-progress'],
      { allowFailure: true }
    ),
    'Knip cycle analysis'
  );
  const cycles = (report.issues ?? []).flatMap((issue) => issue.cycles ?? []);
  if (cycles.length > 0) throw new Error(`Dependency cycles detected: ${cycles.length}`);
  console.log('Cycles: zero JavaScript or TypeScript import cycles.');
}

function checkDependencies() {
  const report = parseJson(run('pnpm', ['audit', '--json'], { allowFailure: true }), 'pnpm audit');
  const advisories = Object.values(report.advisories ?? {});
  const critical = advisories.filter((advisory) => advisory.severity === 'critical');
  const high = advisories.filter((advisory) => advisory.severity === 'high');
  const unexpected = [
    ...critical,
    ...high.filter((advisory) => !acceptedHighAdvisories.has(advisory.github_advisory_id)),
  ];
  const observed = {
    critical: critical.length,
    highIds: new Set(high.map((advisory) => advisory.github_advisory_id)).size,
    highFindings: high.reduce(
      (sum, advisory) =>
        sum + advisory.findings.reduce((count, finding) => count + finding.paths.length, 0),
      0
    ),
  };
  console.log(
    `Dependencies: ${observed.critical} critical, ${observed.highIds} accepted high IDs ` +
      `across ${observed.highFindings} path findings; ${unexpected.length} unexpected.`
  );
  if (unexpected.length > 0) {
    throw new Error(
      `Unexpected critical/high advisories: ${unexpected
        .map((advisory) => advisory.github_advisory_id)
        .join(', ')}`
    );
  }
  const extractZipExceptionExpires = new Date('2026-09-14T00:00:00Z');
  if (
    Date.now() >= extractZipExceptionExpires.getTime() &&
    high.some((advisory) => advisory.github_advisory_id === 'GHSA-jmr9-qjv8-65gv')
  ) {
    throw new Error('extract-zip dependency exception expired on 2026-09-14 (#56).');
  }
  failRegressions('Dependencies', observed, baselines.dependencies);
}

const suppressionPattern =
  /biome-ignore|eslint-disable|@ts-ignore|@ts-expect-error|istanbul ignore|c8 ignore|(?:test|base)\.skip\(|\bTODO\b|\bFIXME\b/u;

function sourceFiles(root) {
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(path));
    else if (entry.isFile() && sourceExtensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

function checkSuppressions() {
  const files = ['src', 'scripts', 'extension/src', 'landing-astro/src'].flatMap((root) =>
    sourceFiles(resolve(projectRoot, root))
  );
  files.push(resolve(projectRoot, 'worker.mjs'));
  const matches = files
    .filter((file) => file !== currentFile)
    .flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => suppressionPattern.test(line))
    );
  console.log(`Suppressions: ${matches.length} source/test markers.`);
  if (matches.length > baselines.suppressions) {
    throw new Error(`Suppressions regressed: ${matches.length} > ${baselines.suppressions}.`);
  }
  if (matches.length < baselines.suppressions) {
    console.log('Suppressions improved; lower the checked-in baseline intentionally.');
  }
}

function checkHygiene() {
  const parent = run('git', ['rev-parse', '--verify', 'HEAD^'], { allowFailure: true });
  if (parent.status === 0) run('git', ['diff', '--check', 'HEAD^', 'HEAD', '--', ...hygienePaths]);
  else run('git', ['diff-tree', '--check', '--root', '-r', 'HEAD', '--', ...hygienePaths]);
  run('git', ['diff', '--check', 'HEAD', '--', ...hygienePaths]);
  const conflicts = run('git', ['grep', '-nE', '^(<<<<<<< |=======|>>>>>>> )', '--', '.'], {
    allowFailure: true,
  });
  if (conflicts.status === 0) throw new Error(`Conflict markers found:\n${conflicts.stdout}`);
  if (conflicts.status > 1) throw new Error(`git grep failed with status ${conflicts.status}`);
  const generated = run('git', ['ls-files', '--others', '--exclude-standard'])
    .stdout.trim()
    .split('\n')
    .filter(Boolean)
    .filter((file) =>
      /(^|\/)(?:coverage|dist|build|\.next|\.open-next|\.wrangler)(?:\/|$)|(?:^|\/)\.DS_Store$|\.tsbuildinfo$/u.test(
        file
      )
    );
  if (generated.length > 0) {
    throw new Error(`Untracked generated artifacts found: ${generated.join(', ')}`);
  }
  console.log('Repository hygiene: whitespace, conflicts, and generated outputs pass.');
}

const checks = {
  unused: checkUnused,
  complexity: checkComplexity,
  duplication: checkDuplication,
  cycles: checkCycles,
  dependencies: checkDependencies,
  suppressions: checkSuppressions,
  hygiene: checkHygiene,
};
const selected = process.argv[2];

if (!Object.hasOwn(checks, selected)) {
  console.error(`Usage: check-code-health.mjs <${Object.keys(checks).join('|')}>`);
  process.exit(2);
}

try {
  checks[selected]();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
