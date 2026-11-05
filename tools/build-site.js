import { build } from 'esbuild';
import { cpSync, rmSync, statSync } from 'node:fs';

// The production build: the folder of the site is copied, and the two entry files, js/script.js and css/style.css, are replaced by single bundles.
// The pages keep their addresses (the same two links), so nothing else changes; the 70 JS modules and the 10 CSS files of the source become two requests.
export const buildSite = async ({ from = 'site', to = 'dist' } = {}) => {
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
  await build({
    entryPoints: [`${from}/js/script.js`],
    outfile: `${to}/js/script.js`,
    bundle: true,
    format: 'esm',
    target: 'es2022',
    minify: true,
    legalComments: 'none',
    logLevel: 'silent',
  });
  // Only whitespace is removed from the styles: the pairs of a plain colour and a color-mix() with the same property must stay as they are.
  await build({
    entryPoints: [`${from}/css/style.css`],
    outfile: `${to}/css/style.css`,
    bundle: true,
    minifyWhitespace: true,
    external: ['*.svg', '*.png', '*.woff2', '*.woff'],
    logLevel: 'silent',
  });
  const size = (file) => statSync(`${to}/${file}`).size;
  return { script: size('js/script.js'), style: size('css/style.css') };
};
