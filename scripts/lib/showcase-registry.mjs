/** Bounded presentation configuration, shared by Node checks and browser hosts. */
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const identifier = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 80;
const requireValue = (value, message) => { if (!value) throw new TypeError(`Showcase registry: ${message}`); };
const text = (value, label, max = 240) => requireValue(typeof value === 'string' && value.trim() && value.length <= max, `${label} needs bounded text.`);
const keys = (value, allowed, label) => requireValue(Object.keys(value).every(key => allowed.includes(key)), `${label} contains an unknown field.`);
const mediaKeys = ['film', 'gif', 'hero', 'exploded', 'detail'];
export function validateShowcaseRegistry(input, { modelIds, tours } = {}) {
  requireValue(plain(input), 'a configuration object is required.');
  keys(input, ['schemaVersion', 'defaultShowcaseId', 'items'], 'configuration');
  requireValue(input.schemaVersion === 1, 'unsupported schemaVersion.');
  requireValue(Array.isArray(input.items) && input.items.length > 0 && input.items.length <= 24, 'use between 1 and 24 showcases.');
  const ids = new Set(), models = new Set();
  for (const item of input.items) {
    requireValue(plain(item), 'each entry must be an object.');
    keys(item, ['id','modelId','tourId','studyNumber','title','version','shortTitle','description','sourceUrl','attribution','ready','action','chapterCopy','media'], 'entry');
    for (const key of ['id','modelId','tourId']) requireValue(identifier(item[key]), `${key} needs a stable identifier.`);
    requireValue(!ids.has(item.id), `duplicate showcase ${item.id}.`); ids.add(item.id);
    requireValue(!models.has(item.modelId), `duplicate model ${item.modelId}.`); models.add(item.modelId);
    requireValue(/^\d{2}$/.test(item.studyNumber), 'studyNumber must contain two digits.');
    for (const key of ['title','shortTitle','description','attribution']) text(item[key], key, key === 'description' || key === 'attribution' ? 600 : 100);
    if (item.version !== undefined) text(item.version, 'version', 24);
    let source; try { source = new URL(item.sourceUrl); } catch {}
    requireValue(source?.protocol === 'https:' && !source.username && !source.password, 'sourceUrl must be a public HTTPS URL.');
    requireValue(plain(item.ready), 'ready copy is required.'); keys(item.ready, ['title','description'], 'ready');
    text(item.ready.title, 'ready.title', 160); text(item.ready.description, 'ready.description', 400);
    requireValue(plain(item.action), 'action copy is required.'); keys(item.action, ['noun','note'], 'action');
    text(item.action.noun, 'action.noun', 48); text(item.action.note, 'action.note', 400);
    if (item.chapterCopy !== undefined) {
      requireValue(plain(item.chapterCopy) && Object.keys(item.chapterCopy).length <= 50, 'chapterCopy must be keyed by chapter ID.');
      for (const [chapterId, copy] of Object.entries(item.chapterCopy)) {
        requireValue(identifier(chapterId) && plain(copy), 'invalid chapterCopy entry.'); keys(copy, ['title','description'], 'chapter copy');
        text(copy.title, 'chapter title', 160); text(copy.description, 'chapter description', 400);
      }
    }
    requireValue(plain(item.media), 'media must be an object.'); keys(item.media, mediaKeys, 'media');
    for (const [role, path] of Object.entries(item.media)) {
      requireValue(typeof path === 'string' && /^docs\/media\/[A-Za-z0-9_./-]+\.(?:mp4|webm|gif|png|jpe?g|webp)$/.test(path) && !path.split('/').some(segment => segment === '..' || segment === '.'), `unsafe ${role} media path.`);
      requireValue(['film','gif'].includes(role) ? role === 'film' ? /\.(mp4|webm)$/.test(path) : /\.gif$/.test(path) : /\.(png|jpe?g|webp)$/.test(path), `${role} media has the wrong format.`);
    }
    if (modelIds) requireValue(modelIds.has(item.modelId), `unknown model ${item.modelId}.`);
    if (tours) {
      const tour = tours.get(item.modelId);
      requireValue(tour?.id === item.tourId, `tour ${item.tourId} does not belong to ${item.modelId}.`);
      const chapters = new Set(tour.chapters.map(chapter => chapter.id));
      requireValue(Object.keys(item.chapterCopy || {}).every(id => chapters.has(id)), `chapter copy is not in ${item.tourId}.`);
    }
  }
  requireValue(identifier(input.defaultShowcaseId) && ids.has(input.defaultShowcaseId), 'defaultShowcaseId must identify an entry.');
  return input;
}
export function resolveRegistryShowcase(registry, search = '') {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search);
  const selected = params.get('model');
  const id = selected === null ? registry.defaultShowcaseId : selected;
  const result = registry.items.find(item => item.id === id);
  if (!result) throw Object.assign(new Error(`Unknown showcase: ${(id || '(empty)').slice(0, 80)}. Choose a robot to continue.`), { code:'UNKNOWN_SHOWCASE' });
  return result;
}
export function chapterPresentation(showcase, chapter) {
  if (!chapter) return showcase.ready;
  return Object.hasOwn(showcase.chapterCopy || {}, chapter.id) ? showcase.chapterCopy[chapter.id] : { title:chapter.title, description:chapter.caption || '' };
}
