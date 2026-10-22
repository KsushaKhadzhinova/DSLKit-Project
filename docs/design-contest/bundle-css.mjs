// Usage: node bundle-css.mjs <output.css>
// Joins the real Part 1 stylesheets (tokens, base, components, header, footer) into one file for the Part 2 apps,
// so Part 2 uses exactly the same CSS as the Part 1 site.
import { readFileSync, writeFileSync } from 'node:fs';
const dir = 'E:/DSLKit-Project/site/css/';
const files = ['variables.css', 'base.css', 'components.css', 'header.css', 'footer.css'];
const parts = files.map((f) => `/* ${f} (copied from site/css, Part 1) */\n` + readFileSync(dir + f, 'utf8'));
// The block of 44 px touch targets lives at the end of adaptive.css, without it logos, links and chips shrink to their text height.
const adaptive = readFileSync(dir + 'adaptive.css', 'utf8');
parts.push('/* touch targets (copied from site/css/adaptive.css, Part 1) */\n' + adaptive.slice(adaptive.indexOf('/* Touch targets')));
const css = parts.join('\n');
writeFileSync(process.argv[2], css);
console.log('written', process.argv[2], css.length, 'bytes');
