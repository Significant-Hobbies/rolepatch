import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import ts from 'typescript';

const nativeControls = new Set([
  'button',
  'input',
  'label',
  'select',
  'textarea',
  'details',
  'summary',
  'dialog',
  'progress',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'th',
  'tr',
  'td',
  'caption',
]);
const interactiveRoles = new Set([
  'button',
  'dialog',
  'alertdialog',
  'combobox',
  'radio',
  'checkbox',
  'switch',
]);
const failures = [];
let files = 0;

for (const root of ['src/app', 'src/components']) {
  for (const relativePath of readdirSync(root, { recursive: true })) {
    if (extname(relativePath) !== '.tsx') continue;
    const path = join(root, relativePath);
    const source = ts.createSourceFile(
      path,
      readFileSync(path, 'utf8'),
      ts.ScriptTarget.Latest,
      true
    );
    files++;

    function report(node, message) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
      failures.push(`${path}:${line + 1} ${message}`);
    }

    function visit(node) {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const module = node.moduleSpecifier.text;
        if (module.startsWith('@/components/ui/') || module.startsWith('@radix-ui/')) {
          report(node, `Use the SaaS Maker UI export in place of ${module}`);
        }
      }
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(source);
        if (nativeControls.has(tag)) report(node, `Use a shared component for ${tag}`);
        if (/^[a-z]/.test(tag)) {
          const role = node.attributes.properties.find(
            (attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'role'
          )?.initializer;
          if (role && ts.isStringLiteral(role) && interactiveRoles.has(role.text)) {
            report(node, `Use the shared ${role.text} component`);
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`SaaS Maker UI controls verified across ${files} React files.`);
}
