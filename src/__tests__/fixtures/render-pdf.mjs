// Native bridge for the opt-in local PDF test; invokes the actual shared renderer.
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../../../', import.meta.url));
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/'))
      return nextResolve(
        pathToFileURL(join(root, 'src', `${specifier.slice(2)}.ts`)).href,
        context
      );
    return nextResolve(specifier, context);
  },
});
const { renderPdf } = await import(pathToFileURL(join(root, 'src/lib/pdf.ts')).href);
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const bytes = await renderPdf(Buffer.concat(chunks).toString());
process.stdout.write(Buffer.from(bytes).toString('base64'));
