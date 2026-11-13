import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export async function inventory(dir = resolve(root, 'public')) {
  const assets = {};
  async function walk(path) {
    for (const entry of (await readdir(path, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
      const full = resolve(path, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) {
        const bytes = await readFile(full);
        assets[relative(dir, full).split('\\').join('/')] = { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
      }
    }
  }
  await walk(dir);
  return assets;
}
if (process.argv.includes('--write')) {
  const assets = await inventory();
  await writeFile(resolve(root, 'assets-manifest.json'), JSON.stringify({ algorithm: 'sha256', assets }, null, 2) + '\n');
  console.log(`Recorded ${Object.keys(assets).length} static assets.`);
}
