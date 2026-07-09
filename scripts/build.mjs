import { copyFile, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const dist = join(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await mkdir(join(dist, 'options'), { recursive: true });

await Promise.all([
  copyFile(join(root, 'src/manifest.json'), join(dist, 'manifest.json')),
  copyFile(join(root, 'src/options/options.html'), join(dist, 'options/options.html')),
  copyFile(join(root, 'src/options/options.css'), join(dist, 'options/options.css'))
]);

await Promise.all([
  esbuild.build({
    entryPoints: [join(root, 'src/background/index.ts')],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    outfile: join(dist, 'background.js')
  }),
  esbuild.build({
    entryPoints: [join(root, 'src/content/index.ts')],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    outfile: join(dist, 'content.js')
  }),
  esbuild.build({
    entryPoints: [join(root, 'src/options/index.ts')],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    outfile: join(dist, 'options/options.js')
  })
]);

// Bundle standalone testable modules so tests can import from dist/
const testableModules = ['url', 'hash', 'formatter', 'settings', 'client', 'types'];
const testableSourceDir = (name) => {
  if (name === 'client') return join(root, 'src/siyuan/client.ts');
  return join(root, `src/shared/${name}.ts`);
};

await Promise.all(
  testableModules.map((name) =>
    esbuild.build({
      entryPoints: [testableSourceDir(name)],
      bundle: true,
      format: 'esm',
      platform: 'neutral',
      outfile: join(dist, 'testable', `${name}.js`)
    })
  )
);
