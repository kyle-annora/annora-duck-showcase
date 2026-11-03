#!/usr/bin/env node
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProject } from './lib/project-config.mjs';
import { validateShowcaseRegistry } from './lib/showcase-registry.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
try {
  const { models } = await loadProject(root);
  const registry = validateShowcaseRegistry(JSON.parse(await readFile(path.join(root, 'content/showcases/registry.json'), 'utf8')), {
    modelIds: new Set(models.map(model => model.manifest.id)),
    tours: new Map(models.map(model => [model.manifest.id, model.tour])),
  });
  const mediaRoot = await realpath(path.join(root, 'docs/media'));
  for (const item of registry.items) {
    if (process.argv.includes('--release') && ['film', 'gif', 'hero', 'exploded', 'detail'].some(role => !item.media[role])) {
      throw new Error(`${item.id}: publication requires a matching film, GIF and three keyframes.`);
    }
    for (const [role, relative] of Object.entries(item.media)) {
      const file = await realpath(path.join(root, relative));
      if (!file.startsWith(`${mediaRoot}${path.sep}`) || !(await stat(file)).isFile() || !(await stat(file)).size) {
        throw new Error(`${item.id}: ${role} must identify a nonempty file within docs/media.`);
      }
    }
    console.log(`${item.id}: model, tour and ${Object.keys(item.media).length} media assets verified.`);
  }
} catch (error) {
  console.error(`Showcase check failed: ${error.message}`);
  process.exitCode = 1;
}
