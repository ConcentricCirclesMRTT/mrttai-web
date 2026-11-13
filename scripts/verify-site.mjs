import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inventory } from './asset-manifest.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const built = process.argv.includes('--dist');
const base = resolve(root, built ? 'dist' : 'public');
const expected = JSON.parse(await readFile(resolve(root, 'assets-manifest.json'), 'utf8')).assets;
const actual = await inventory(base);
const errors = [];
for (const [path, asset] of Object.entries(expected)) {
  if (actual[path]?.sha256 !== asset.sha256 || actual[path]?.bytes !== asset.bytes) errors.push(`Asset missing or changed: ${path}`);
}
if (!built) for (const path of Object.keys(actual)) if (!expected[path]) errors.push(`Unlisted asset: ${path}`);
async function exists(path) { try { return await stat(path); } catch { return null; } }
async function checkReference(page, ref) {
  if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(ref)) return;
  const address = new URL(ref.replaceAll('&amp;', '&'), 'https://site.invalid/' + page);
  if (address.pathname === '/' && !built) return;
  let path = resolve(base, '.' + decodeURIComponent(address.pathname));
  const info = await exists(path);
  if (info?.isDirectory()) path = resolve(path, 'index.html');
  if (!(await exists(path))?.isFile()) errors.push(`Broken reference in ${page}: ${ref}`);
}
const pages = ['explore/index.html', 'explore/explore.html', 'explore/film/index.html', 'neube-sr-showcase/index.html'];
if (built) pages.push('index.html');
for (const page of pages) {
  const html = await readFile(resolve(base, page), 'utf8');
  for (const match of html.matchAll(/(?:src|href|data-src)=["']([^"']+)["']/g)) await checkReference(page, match[1]);
}
for (const file of ['explore/assets/model.json', 'explore/assets/lod/manifest-v26.json', 'explore/assets/downloads.json']) {
  async function check(value) {
    if (Array.isArray(value)) { for (const child of value) await check(child); }
    else if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
      if (key === 'url' && typeof child === 'string') await checkReference('explore/explore.html', child);
      else await check(child);
    }
  }
  await check(JSON.parse(await readFile(resolve(base, file), 'utf8')));
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Verified ${Object.keys(expected).length} assets, primary page links and model/download indexes${built ? ' in dist' : ''}.`);
