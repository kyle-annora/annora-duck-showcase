import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateShowcaseRegistry, resolveRegistryShowcase, chapterPresentation } from '../scripts/lib/showcase-registry.mjs';
const registry = JSON.parse(await readFile(new URL('../content/showcases/registry.json', import.meta.url), 'utf8'));
const fixture = () => structuredClone(registry);

test('public registry keeps the approved Duck default and only complete robot identities', () => {
  assert.equal(validateShowcaseRegistry(registry), registry);
  assert.deepEqual(registry.items.map(item => item.id), ['open-duck', 'hexapod', 'dropbear']);
  assert.equal(resolveRegistryShowcase(registry, '').id, 'open-duck');
  assert.equal(resolveRegistryShowcase(registry, '?appearance=dark').id, 'open-duck');
  assert.equal(resolveRegistryShowcase(registry, '?model=hexapod').modelId, 'hexapod');
  assert.equal(resolveRegistryShowcase(registry, new URLSearchParams({ model:'dropbear' })).tourId, 'dropbear-showcase');
  assert.equal(registry.items.some(item => item.modelId === 'dropbear-arm'), false, 'the arm proof is not a public robot');
});

test('invalid, empty and case-changed model requests never silently show Duck', () => {
  for (const search of ['?model=', '?model=missing', '?model=Dropbear', '?model=dropbear-arm']) {
    assert.throws(() => resolveRegistryShowcase(registry, search), error => error.code === 'UNKNOWN_SHOWCASE');
  }
  assert.throws(() => resolveRegistryShowcase(registry, `?model=${'x'.repeat(10000)}`), error => error.message.length < 180);
});

test('registry rejects duplicate identities, invalid references and accidental fields', () => {
  for (const mutate of [
    value => { value.items[1].id = value.items[0].id; },
    value => { value.items[1].modelId = value.items[0].modelId; },
    value => { value.defaultShowcaseId = 'missing'; },
    value => { value.items[0].sourceUrl = 'http://example.com'; },
    value => { value.items[0].sourceUrl = 'https://name:password@example.com'; },
    value => { value.items[1].displayFile = 'unexpected'; },
    value => { value.items[1].action.extra = true; },
    value => { value.items[1].chapterCopy = [{ title:'a' }]; }
  ]) {
    const value = fixture(); mutate(value); assert.throws(() => validateShowcaseRegistry(value), TypeError);
  }
  assert.throws(() => validateShowcaseRegistry(registry, { modelIds:new Set(['open-duck']) }), /unknown model/);
  const tours = new Map(registry.items.map(item => [item.modelId, { id:item.tourId, chapters:Object.keys(item.chapterCopy || {}).map(id => ({ id })) }]));
  validateShowcaseRegistry(registry, { tours });
  const wrongTour = new Map(tours); wrongTour.set('hexapod', { id:'open-duck-showcase', chapters:[] });
  assert.throws(() => validateShowcaseRegistry(registry, { tours:wrongTour }), /does not belong/);
  const staleChapter = fixture(); staleChapter.items[1].chapterCopy = { missing:{ title:'Wrong chapter', description:'Cannot be inferred by position.' } };
  assert.throws(() => validateShowcaseRegistry(staleChapter, { tours }), /chapter copy is not in/);
});

test('media stays optional per robot but declared media is bounded and typed', () => {
  for (const media of [
    { film:'docs/media/../other.mp4' }, { hero:'https://example.com/hero.png' },
    { gif:'docs/media/still.png' }, { hero:'docs/media/film.mp4' },
    { film:'docs/media/x.mp4?token=secret' }, { arbitrary:'docs/media/hero.png' }
  ]) {
    const value = fixture(); value.items[1].media = media;
    assert.throws(() => validateShowcaseRegistry(value), TypeError);
  }
  const value = fixture(); value.items[1].media = {};
  assert.equal(validateShowcaseRegistry(value).items[1].media.film, undefined, 'missing media must not borrow Duck files');
});

test('caption presentation follows authored chapter IDs rather than a global beat index', () => {
  const duck = registry.items[0], hexapod = registry.items[1];
  assert.equal(chapterPresentation(duck, null), duck.ready);
  assert.equal(chapterPresentation(duck, { id:'head', title:'Other title', caption:'Other caption' }), duck.chapterCopy.head);
  const chapter = { id:'leg-reach', title:'One leg, three joints.', caption:'The hip turns while the foot lifts.' };
  assert.deepEqual(chapterPresentation(hexapod, chapter), { title:chapter.title, description:chapter.caption });
  assert.deepEqual(chapterPresentation(duck, chapter), { title:chapter.title, description:chapter.caption });
  assert.deepEqual(chapterPresentation(duck, { id:'constructor', title:'Actual title', caption:'Actual caption' }), { title:'Actual title', description:'Actual caption' });
});
