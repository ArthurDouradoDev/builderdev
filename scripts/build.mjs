// Gera dist/cli.js (o CLI, para o node) e dist/ui/ (a UI do painel, para o navegador).
import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const ui = join(root, 'src/dashboard/ui');
const out = join(root, 'dist/ui');

await Promise.all([
  build({
    entryPoints: [join(root, 'src/cli.ts')],
    outfile: join(root, 'dist/cli.js'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  }),
  build({
    entryPoints: [join(ui, 'main.ts')],
    outfile: join(out, 'app.js'),
    bundle: true,
    platform: 'browser',
    format: 'iife',
    target: 'es2022',
    minify: true,
  }),
]);

mkdirSync(out, { recursive: true });
for (const file of ['index.html', 'styles.css']) copyFileSync(join(ui, file), join(out, file));
