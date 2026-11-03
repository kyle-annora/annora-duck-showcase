import registry from '../../content/showcases/registry.json';
import { validateShowcaseRegistry, resolveRegistryShowcase, chapterPresentation } from '../../scripts/lib/showcase-registry.mjs';
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
export const SHOWCASE_REGISTRY = freeze(validateShowcaseRegistry(registry));
export const SHOWCASES = SHOWCASE_REGISTRY.items;
export const getShowcase = id => SHOWCASES.find(item => item.id === id) || null;
export const resolveShowcase = search => resolveRegistryShowcase(SHOWCASE_REGISTRY, search);
export { chapterPresentation };
export const showcaseTitle = item => [item.title, item.version].filter(Boolean).join(' ');
const mediaURLs = import.meta.glob('../../docs/media/**/*.{mp4,webm,gif,png,jpg,jpeg,webp}', { eager:true, query:'?url', import:'default' });
export function resolveShowcaseMedia(showcase) {
  if (!showcase || !Object.keys(showcase.media).length) return null;
  const entries = Object.entries(showcase.media).map(([role, path]) => [role, mediaURLs[`../../${path}`] || null]);
  const resolved = Object.fromEntries(entries);
  return Object.values(resolved).some(Boolean) ? resolved : null;
}
