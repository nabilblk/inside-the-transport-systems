// Builds the explorer into one self-contained page: the JS modules in src/ are inlined, in order,
// into the src/index.html template. three.js itself is loaded from jsDelivr through the import map.
//
//   node scripts/build.mjs          production build  -> public/index.html
//   node scripts/build.mjs --dev    keeps the test hooks -> dist/index.dev.html
//
// No dependencies: Node 18 or newer is all it needs.
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dev = process.argv.includes('--dev');

// Load order matters: later files use what earlier ones define.
const MODULES = ['core.js', 'heart.js', 'ch_loop.js', 'ch_blood.js', 'ch_vessels.js', 'ch_heart.js', 'ch_plants.js', 'story.js'];

let js = MODULES.map(f => readFileSync(join(root, 'src', f), 'utf8')).join('\n');

if (!dev) {
  // Drop the block of window.__* helpers that only the headless test bench uses.
  const fence = /^[^\n]*#region dev-only[^\n]*\n[\s\S]*?^[^\n]*#endregion dev-only[^\n]*\n/m;
  if (!fence.test(js)) throw new Error('The dev-only region in src/story.js is missing.');
  js = js.replace(fence, '');
  for (const hook of ['CAMDBG', '__go', '__ff', '__notrans', '__step', '__state', '__tap'])
    if (js.includes(`window.${hook}`)) throw new Error(`Test hook window.${hook} is still in the production build.`);
}

const template = readFileSync(join(root, 'src', 'index.html'), 'utf8');
if (template.split('/*__JS__*/').length !== 2) throw new Error('src/index.html needs exactly one /*__JS__*/ placeholder.');
const html = template.replace('/*__JS__*/', () => js); // a function, so "$&" and friends in the code stay literal

const out = join(root, dev ? 'dist/index.dev.html' : 'public/index.html');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`${relative(root, out)}  ${(statSync(out).size / 1024).toFixed(0)} KB${dev ? '  (dev build, with test hooks)' : ''}`);
