import { buildSite } from './build-site.js';

const sizes = await buildSite();
console.log(`dist/js/script.js ${sizes.script} bytes, dist/css/style.css ${sizes.style} bytes`);
