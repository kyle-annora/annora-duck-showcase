import { createExplorerClient } from '../explorer/embed-client.js';
import { CLIENT_THEMES, resolveTheme, applyThemeTokens } from '../explorer/themes.js';

const $ = id => document.getElementById(id);
const icons = name => { const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); const use = document.createElementNS(el.namespaceURI, 'use'); use.setAttribute('href', `#i-${name}`); el.append(use); return el; };
const clock = value => `${String(Math.floor(Math.max(0, value || 0) / 60)).padStart(2, '0')}:${String(Math.floor(Math.max(0, value || 0)) % 60).padStart(2, '0')}`;
const typeNames = { assembly: 'Whole assembly', system: 'Assembly', subassembly: 'Subassembly', component: 'Source component' };
const fallbackTitle = value => String(value || '').replaceAll('-', ' ').replaceAll('_', ' ');
const beatCopy = [
  ['Meet the mechanism.', 'A complete assembly. Every detail has a place.'],
  ['Look a little closer.', 'Follow the head and its mechanical connections.'],
  ['Open the body.', 'Outer panels reveal the modules beneath.'],
  ['Read the layers.', 'Separate the assemblies. Keep their relationships.'],
  ['Follow one detail.', 'Clear lines reveal the structure around it.'],
  ['Back into place.', 'Every component returns along the same path.'],
  ['A little character.', 'Authored movement follows the source joints.'],
  ['Take it from here.', 'Select a part, inspect it or replay the presentation.'],
];

let client = null, iframe = null, state = null, capabilities = null, rootId = 'open-duck', tour = null;
let initialized = false, connected = false, mountVersion = 0, requestVersion = 0, busy = false;
let treeQuery = '', selectedRequest = null, scrubbing = false, treeSelection = null;
let separating = false, separationRequest = null, separationPending = null;
let currentAccent = resolveTheme('ember'), currentAppearance = 'light';
let paletteKey = null, selectionKey = null;
const nodes = new Map(), children = new Map(), expanded = new Set();
const abort = new AbortController();
const on = (target, type, work, options = {}) => target.addEventListener(type, work, { ...options, signal: abort.signal });

function message(text, error = false) { $('action-message').textContent = text; $('action-message').hidden = !text; $('action-message').dataset.error = String(error); }
function palette(theme = currentAccent, appearance = currentAppearance) {
  currentAccent = theme; currentAppearance = appearance;
  const key = `${theme.id}:${theme.accent}:${appearance}`;
  if (paletteKey === key) return;
  paletteKey = key;
  document.documentElement.dataset.appearance = appearance;
  applyThemeTokens(theme, document.documentElement, appearance);
  document.querySelector('meta[name="theme-color"]').content = appearance === 'dark' ? '#1b1b1b' : '#f3f3f1';
  for (const button of document.querySelectorAll('button[data-appearance]')) button.setAttribute('aria-pressed', String(button.dataset.appearance === appearance));
  for (const button of document.querySelectorAll('[data-accent]')) button.setAttribute('aria-pressed', String(button.dataset.accent === theme.id));
  $('custom-accent').value = theme.accent;
}

async function invoke(method, params = {}, connection = client) {
  if (!connection || connection !== client) throw new Error('The assembly is not connected yet.');
  const result = await connection.request(method, params);
  if (connection !== client) throw new Error('The assembly connection changed. Try this action again.');
  if (result.payload.status === 'failed') throw Object.assign(new Error(result.payload.error.message), { code: result.payload.error.code });
  if (result.payload.status === 'cancelled') return null;
  return result.payload.result;
}
function action(work, { lock = true } = {}) {
  return async event => {
    if (lock && busy) return;
    const version = ++requestVersion;
    if (lock) { busy = true; drawControls(); }
    message('');
    try { await work(event); }
    catch (error) { if (version === requestVersion) message(error.message || 'This action could not finish. Please try again.', true); }
    finally { if (lock) { busy = false; drawControls(); } }
  };
}
function menusClose(except = null) { for (const menu of document.querySelectorAll('.settings-menu')) if (menu !== except) menu.open = false; }
function partsOpen(value, focus = true) {
  $('parts-panel').hidden = !value; $('parts-toggle').setAttribute('aria-expanded', String(value)); document.body.dataset.partsOpen = String(value);
  if (value) { detailsOpen(false); if (focus) $('parts-search').focus({ preventScroll: true }); }
  else if (focus) $('parts-toggle').focus({ preventScroll: true });
}
function detailsOpen(value) {
  $('detail-panel').dataset.open = String(value); $('details-toggle').setAttribute('aria-expanded', String(value)); document.body.dataset.detailsOpen = String(value);
  if (value) partsOpen(false, false);
}

function drawControls() {
  const ready = connected && state?.lifecycle === 'ready';
  const active = state?.tour?.active, status = state?.tour?.status;
  const completed = status === 'completed';
  $('play-showcase').disabled = !ready || !tour || busy;
  $('play-showcase').querySelector('span').textContent = busy ? 'Preparing…' : !active ? 'Play showcase' : status === 'playing' ? 'Pause' : completed ? 'Replay showcase' : 'Resume';
  $('play-showcase').querySelector('use').setAttribute('href', status === 'playing' && !busy ? '#i-pause' : '#i-play');
  $('replay-showcase').disabled = !ready || !tour || busy;
  $('showcase-progress').disabled = !ready || !tour || busy;
  $('explore-freely').disabled = !ready || busy || !active;
  $('parts-toggle').disabled = !ready; $('details-toggle').disabled = !ready; $('reset-view').disabled = !ready || busy;
  $('back-assembly').disabled = !ready || busy;
  $('inspect-selection').disabled = !ready || !state?.navigation?.selectedId || busy;
  $('isolate-selection').disabled = !ready || state?.navigation?.selectedId === rootId && !state?.navigation?.isolated || busy;
  $('isolate-selection').textContent = state?.navigation?.isolated ? 'Show context' : 'Isolate';
  for (const element of document.querySelectorAll('button[data-style], button[data-appearance], [data-accent], #grid-option, #quality-option')) element.disabled = !ready || busy;
  $('custom-accent').disabled = !ready || busy || !capabilities?.customAccent;
  document.body.dataset.playing = String(active && status === 'playing');
  document.body.dataset.touring = String(Boolean(active));
  $('detail-panel').inert = Boolean(active && status === 'playing');
  const scope = nodes.get(state?.navigation?.scopeId), assembly = Boolean(scope?.childIds?.length);
  $('manual-actions').hidden = Boolean(active) || !ready;
  $('separation-progress').disabled = !ready || busy || !assembly;
  $('separate-assembly').disabled = !ready || busy || !assembly;
  $('restore-assembly').disabled = !ready || busy || !(state?.presentation?.explosion > .001 || state?.presentation?.mode === 'operate');
  const operating = state?.presentation?.mode === 'operate', operation = state?.operation;
  $('play-motion').hidden = !capabilities?.operation?.enabled;
  $('motion-note').hidden = !capabilities?.operation?.enabled;
  $('play-motion').disabled = !ready || busy || !operation?.available;
  $('play-motion').querySelector('span').textContent = operating && operation.status === 'playing' ? 'Pause gesture' : operating && operation.progress > 0 && operation.progress < 1 ? 'Resume gesture' : operating && operation.progress >= 1 ? 'Replay gesture · 2.5 s' : 'Play gesture · 2.5 s';
  $('play-motion').querySelector('use').setAttribute('href', operating && operation.status === 'playing' ? '#i-pause' : '#i-play');
}
function currentBeat(time) {
  if (!tour?.chapters?.length) return -1;
  const found = tour.chapters.findIndex(chapter => time < chapter.start + chapter.duration - .001);
  return found < 0 ? tour.chapters.length - 1 : found;
}
function updateSelection(node) {
  if (!node) return;
  const key = `${node.id}:${nodes.size}`;
  if (selectionKey !== key) {
    selectionKey = key;
    $('selected-title').textContent = node.title;
    $('selected-description').textContent = node.description || 'A source component in the Open Duck assembly.';
    $('selected-kind').textContent = typeNames[node.kind] || 'Source component';
    const count = nodes.size, at = [...nodes.keys()].indexOf(node.id) + 1;
    $('selected-code').textContent = node.id === rootId ? '01 / ROOT' : `${String(at).padStart(2, '0')} / ${String(count).padStart(2, '0')}`;
    $('inspect-selection').querySelector('span').textContent = node.childIds?.length ? 'Inspect assembly' : 'Frame part';
  }
  $('isolate-selection').setAttribute('aria-pressed', String(Boolean(state?.navigation?.isolated)));
  if (treeSelection !== node.id) {
    treeSelection = node.id;
    for (const line of $('component-tree').querySelectorAll('.tree-line')) {
      const selected = line.dataset.node === node.id;
      line.classList.toggle('selected', selected);
      line.querySelector('.tree-select').setAttribute('aria-pressed', String(selected));
    }
  }
}
function draw(next) {
  if (!next?.lifecycle) return;
  state = next;
  const ready = state.lifecycle === 'ready';
  $('connection-screen').hidden = ready;
  if (state.lifecycle === 'error') { $('connection-message').textContent = 'The assembly could not be loaded.'; $('retry').hidden = false; }
  const nav = state.navigation || {}, view = state.presentation || {}, transport = state.tour || {}, display = state.appearance?.display || {};
  const themeState = state.appearance?.theme;
  const theme = resolveTheme(themeState?.id || currentAccent.id, themeState?.accent || themeState?.revision || currentAccent.accent);
  palette(theme, display.appearance || currentAppearance);
  $('grid-option').checked = Boolean(display.grid);
  if (state.appearance?.quality) $('quality-option').value = state.appearance.quality;
  const styleTitle = { engineering: 'Engineering', linework: 'Linework', flat: 'Flat highlight' }[view.renderStyle] || 'Engineering';
  $('display-label').textContent = styleTitle; $('selected-view').textContent = styleTitle;
  for (const b of document.querySelectorAll('[data-style]')) b.setAttribute('aria-pressed', String(b.dataset.style === view.renderStyle));
  const selection = nodes.get(nav.selectedId);
  if (selection) updateSelection(selection);
  else if (ready && nav.selectedId && selectedRequest !== nav.selectedId) {
    selectedRequest = nav.selectedId;
    invoke('getNode', { nodeId: nav.selectedId }).then(node => { if (node) { nodes.set(node.id, node); if (state.navigation.selectedId === node.id) updateSelection(node); } }).catch(() => {}).finally(() => { selectedRequest = null; });
  }
  $('scope-name').textContent = nav.scopeId === rootId ? 'Whole assembly' : nodes.get(nav.scopeId)?.title || 'Inside assembly';
  const parent = nodes.get(nodes.get(nav.scopeId)?.parentId);
  $('back-assembly').hidden = !parent;
  $('back-assembly').querySelector('span').textContent = parent?.id === rootId ? 'Whole assembly' : parent?.title || 'Parent assembly';
  $('back-assembly').setAttribute('aria-label', `Back to ${parent?.title || 'parent assembly'}`);
  document.body.dataset.scoped = String(Boolean(parent));
  if (!separating) {
    const fraction = view.explosion || 0;
    $('separation-progress').value = fraction;
    $('separation-progress').style.setProperty('--progress', `${fraction * 100}%`);
    $('separation-value').textContent = `${Math.round(fraction * 100)}%`;
  }
  const time = transport.active ? transport.time || 0 : 0;
  if (!scrubbing) { $('showcase-progress').value = time; $('showcase-progress').style.setProperty('--progress', `${Math.min(100, time / (tour?.duration || 20) * 100)}%`); }
  $('elapsed-time').textContent = clock(time);
  const beat = transport.active ? currentBeat(time) : -1;
  const title = beatCopy[beat] || ['Meet the mechanism.', 'A short presentation. Every part within reach.'];
  $('beat-number').textContent = beat < 0 ? 'READY TO EXPLORE' : `${String(beat + 1).padStart(2, '0')} / ${String(tour.chapters.length).padStart(2, '0')} · ${(tour.chapters[beat]?.label || 'Showcase').toUpperCase()}`;
  $('beat-title').textContent = title[0]; $('beat-description').textContent = title[1];
  const viewing = !ready ? 'Preparing the assembly' : transport.active ? transport.status === 'playing' ? 'Showcase playing' : transport.status === 'completed' ? 'Presentation complete' : 'Showcase paused' : 'Free exploration';
  $('view-status').textContent = viewing;
  $('transport-state').textContent = !ready ? 'Preparing the assembly' : transport.reason === 'takeover' ? 'You have control. Resume when ready.' : transport.status === 'playing' ? tour.chapters[beat]?.label || 'Playing the presentation' : transport.status === 'completed' ? 'Replay or explore the assembly' : transport.active ? 'Paused · drag the timeline to inspect' : 'One short presentation. Then take control.';
  for (const b of $('chapter-track').children) { if (transport.active && b.dataset.chapter === transport.chapterId) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); }
  drawControls();
}

async function loadTree(nodeId) {
  const list = await invoke('getChildren', { nodeId });
  if (!Array.isArray(list)) return;
  children.set(nodeId, list.map(node => node.id));
  for (const node of list) nodes.set(node.id, node);
  await Promise.all(list.filter(node => node.childIds?.length).map(node => loadTree(node.id)));
}
function drawTree() {
  const container = $('component-tree'); container.replaceChildren();
  const search = treeQuery.toLowerCase().trim();
  const matches = node => !search || node.title.toLowerCase().includes(search) || (children.get(node.id) || []).some(id => matches(nodes.get(id)));
  function row(node, parent) {
    if (!node || !matches(node)) return;
    const item = document.createElement('div'), line = document.createElement('div'); line.className = 'tree-line'; line.dataset.node = node.id; line.classList.toggle('selected', state?.navigation?.selectedId === node.id);
    const hasChildren = (children.get(node.id) || []).length > 0;
    const disclosure = document.createElement('button'); disclosure.type = 'button'; disclosure.className = 'tree-disclosure'; disclosure.setAttribute('aria-label', `${expanded.has(node.id) ? 'Collapse' : 'Expand'} ${node.title}`);
    if (hasChildren) { disclosure.append(icons('chevron')); disclosure.setAttribute('aria-expanded', String(expanded.has(node.id) || Boolean(search))); disclosure.addEventListener('click', () => { if (expanded.has(node.id)) expanded.delete(node.id); else expanded.add(node.id); drawTree(); }); }
    else { disclosure.disabled = true; disclosure.setAttribute('aria-hidden', 'true'); disclosure.tabIndex = -1; }
    const select = document.createElement('button'); select.type = 'button'; select.className = 'tree-select'; const label = document.createElement('span'); label.textContent = node.title; select.append(label);
    if (hasChildren) { const count = document.createElement('small'); count.textContent = String(node.childIds.length).padStart(2, '0'); select.append(count); }
    select.setAttribute('aria-pressed', String(state?.navigation?.selectedId === node.id));
    select.addEventListener('click', action(async () => { await invoke('select', { nodeId: node.id }); if (matchMedia('(max-width:760px)').matches) { partsOpen(false, false); detailsOpen(true); } }));
    line.append(disclosure, select); item.append(line); parent.append(item);
    if (hasChildren && (expanded.has(node.id) || search)) { const sub = document.createElement('div'); sub.className = 'tree-children'; item.append(sub); for (const id of children.get(node.id)) row(nodes.get(id), sub); }
  }
  row(nodes.get(rootId), container);
  if (!container.childElementCount) { const note = document.createElement('p'); note.className = 'tree-empty'; note.textContent = 'No matching parts. Try another name.'; container.append(note); }
}
function buildTimeline() {
  $('chapter-track').replaceChildren();
  for (const chapter of tour?.chapters || []) { const b = document.createElement('button'); b.type = 'button'; b.textContent = chapter.label; b.dataset.chapter = chapter.id; b.setAttribute('aria-label', `Inspect chapter: ${chapter.label}`); b.addEventListener('click', action(async () => { await ensureTour(); await invoke('goToTourChapter', { chapterId: chapter.id }); })); $('chapter-track').append(b); }
  $('showcase-progress').max = tour?.duration || 20; $('duration-time').textContent = clock(tour?.duration || 20);
}
async function hydrate(connection) {
  if (initialized || connection !== client) return;
  initialized = true;
  try {
    capabilities = await invoke('getCapabilities', {}, connection);
    rootId = state.navigation.scopeId || 'open-duck';
    const root = await invoke('getNode', { nodeId: rootId }, connection); nodes.set(root.id, root); expanded.add(root.id);
    await loadTree(rootId); drawTree();
    const first = capabilities.tours.items[0]; if (first) tour = await invoke('getTour', { tourId: first.id }, connection);
    buildTimeline();
    for (const button of document.querySelectorAll('[data-style]')) button.hidden = !capabilities.renderStyles.enabled.includes(button.dataset.style);
    for (const button of document.querySelectorAll('[data-accent]')) button.hidden = !capabilities.themes.includes(button.dataset.accent);
    for (const option of $('quality-option').options) option.hidden = !capabilities.qualityProfiles.includes(option.value);
    $('custom-accent').disabled = !capabilities.customAccent;
    await invoke('setDisplayOptions', { options: { appearance: 'light', grid: true } }, connection);
    await invoke('setTheme', { themeId: 'ember' }, connection);
    draw(await invoke('getState', {}, connection));
  } catch (error) { initialized = false; message(error.message, true); }
}
function receive(event, connection) {
  if (connection !== client) return;
  if (['stateChanged', 'ready', 'helloAck'].includes(event.type)) { draw(event.payload?.state || event.payload); if (state?.lifecycle === 'ready') void hydrate(connection); }
  if (event.type === 'takeover') { partsOpen(false, false); message('You have control. Resume the showcase whenever you are ready.'); }
  if (event.type === 'error') message(event.payload?.error?.message || event.payload?.message || 'The assembly could not finish this action.', true);
}
async function ensureTour() {
  if (!tour) throw new Error('The showcase is still being prepared.');
  if (!state?.tour?.active) await invoke('startTour', { tourId: tour.id });
}
async function play() {
  partsOpen(false, false); detailsOpen(false); menusClose();
  if (!state?.tour?.active) await ensureTour();
  else if (state.tour.status === 'playing') await invoke('pauseTour');
  else { if (state.tour.status === 'completed') await invoke('seekTour', { seconds: 0 }); await invoke('resumeTour'); }
}
async function playMotion() {
  const operation = state.operation;
  if (state.presentation.mode === 'operate' && operation.status === 'playing') { await invoke('pauseOperation'); return; }
  await invoke('setOperationSpeed', { speed: 1 }); await invoke('setFollowCamera', { enabled: false });
  if (state.presentation.mode === 'operate' && operation.progress > 0 && operation.progress < 1) await invoke('playOperation');
  else await invoke('replayOperation');
}
async function flushSeparation() {
  if (separationRequest) return;
  const connection = client;
  separationRequest = (async () => {
    try {
      while (separationPending !== null && connection === client) {
        const progress = separationPending; separationPending = null;
        await invoke('setExplosion', { progress, transition: 'immediate' }, connection);
      }
    } catch (error) { if (connection === client) message(error.message, true); }
    finally { separationRequest = null; if (!separating && connection === client && state) draw(state); }
  })();
  await separationRequest;
}
async function mount() {
  const version = ++mountVersion;
  const previous = client; client = null; connected = false; initialized = false; state = null; tour = null; capabilities = null; treeSelection = null; selectedRequest = null; nodes.clear(); children.clear(); expanded.clear();
  selectionKey = null;
  separating = false; separationPending = null;
  $('connection-screen').hidden = false;
  $('connection-message').textContent = 'Preparing Open Duck Mini…';
  $('retry').hidden = true;
  previous?.close(); iframe?.remove();
  const url = new URL('../', location.href);
  url.searchParams.set('model', 'open-duck'); url.searchParams.set('embed', '1'); url.searchParams.set('chrome', 'none'); url.searchParams.set('appearance', 'light'); url.searchParams.set('theme', 'ember'); url.searchParams.set('parentOrigin', location.origin);
  iframe = document.createElement('iframe'); iframe.title = 'Open Duck Mini · Interactive 3D Explorer'; iframe.src = url.href; iframe.allow = 'fullscreen';
  const frame = iframe;
  frame.addEventListener('load', () => {
    if (version !== mountVersion || iframe !== frame) return;
    client?.close(); const connection = createExplorerClient({ iframe: frame, origin: url.origin }); client = connection;
    connection.subscribe(event => receive(event, connection));
    connection.ready.then(payload => { if (client !== connection) return; connected = true; draw(payload.state); if (state?.lifecycle === 'ready') void hydrate(connection); }).catch(error => { if (client !== connection) return; $('connection-message').textContent = 'The assembly did not connect.'; $('retry').hidden = false; message(error.message, true); });
  });
  $('explorer-mount').replaceChildren(frame); drawControls();
}

for (const theme of CLIENT_THEMES) { const b = document.createElement('button'); b.type = 'button'; b.dataset.accent = theme.id; b.setAttribute('aria-pressed', String(theme.id === 'ember')); const swatch = document.createElement('i'); swatch.style.backgroundColor = theme.accent; swatch.setAttribute('aria-hidden', 'true'); b.append(swatch, document.createTextNode(theme.name)); b.addEventListener('click', action(() => invoke('setTheme', { themeId: theme.id }))); $('accent-options').append(b); }
for (const b of document.querySelectorAll('button[data-appearance]')) on(b, 'click', action(() => invoke('setDisplayOptions', { options: { appearance: b.dataset.appearance } })));
for (const b of document.querySelectorAll('[data-style]')) on(b, 'click', action(async () => { await invoke('setRenderStyle', { style: b.dataset.style }); menusClose(); }));
for (const menu of document.querySelectorAll('.settings-menu')) on(menu, 'toggle', () => { if (menu.open) { menusClose(menu); partsOpen(false, false); } });
on(document, 'pointerdown', event => { if (!event.target.closest('.settings-menu')) menusClose(); });
on(document, 'keydown', event => { if (event.key === 'Escape') { const menu = [...document.querySelectorAll('.settings-menu')].find(menu => menu.open); if (menu) { menu.open = false; menu.querySelector('summary').focus(); } else if (!$('parts-panel').hidden) partsOpen(false); else if ($('detail-panel').dataset.open === 'true') { detailsOpen(false); $('details-toggle').focus(); } } });
on($('grid-option'), 'change', action(() => invoke('setDisplayOptions', { options: { grid: $('grid-option').checked } })));
on($('quality-option'), 'change', action(() => invoke('setQuality', { profile: $('quality-option').value })));
on($('custom-accent'), 'change', action(() => invoke('setTheme', { themeId: 'custom', accent: $('custom-accent').value })));
on($('parts-toggle'), 'click', action(async () => {
  const opening = $('parts-panel').hidden;
  if (opening && state?.tour?.status === 'playing') await invoke('pauseTour');
  partsOpen(opening); menusClose();
})); on($('parts-close'), 'click', () => partsOpen(false));
on($('parts-search'), 'input', () => { treeQuery = $('parts-search').value; drawTree(); });
on($('details-toggle'), 'click', action(async () => {
  const opening = $('detail-panel').dataset.open !== 'true';
  if (opening && state?.tour?.status === 'playing') await invoke('pauseTour');
  detailsOpen(opening);
})); on($('details-close'), 'click', () => { detailsOpen(false); $('details-toggle').focus(); });
on($('reset-view'), 'click', action(async () => { if (state?.tour?.active) await invoke('exitTour', { restore: false }); await invoke('setMode', { mode: 'explore' }); await invoke('focus', { nodeId: rootId }); await invoke('frame', { nodeId: rootId }); }));
on($('back-assembly'), 'click', action(async () => { const parentId = nodes.get(state.navigation.scopeId)?.parentId; if (parentId) await invoke('focus', { nodeId: parentId }); }));
on($('inspect-selection'), 'click', action(() => invoke('focus', { nodeId: state.navigation.selectedId })));
on($('isolate-selection'), 'click', action(() => invoke('isolate', { nodeId: state.navigation.isolated ? null : state.navigation.selectedId })));
on($('separate-assembly'), 'click', action(() => invoke('setExplosion', { progress: 1, transition: 'animate' })));
on($('restore-assembly'), 'click', action(() => invoke('setMode', { mode: 'explore' })));
on($('play-motion'), 'click', action(playMotion));
on($('separation-progress'), 'input', () => {
  separating = true; separationPending = Number($('separation-progress').value);
  $('separation-progress').style.setProperty('--progress', `${separationPending * 100}%`);
  $('separation-value').textContent = `${Math.round(separationPending * 100)}%`;
  void flushSeparation();
});
on($('separation-progress'), 'change', () => { separating = false; void flushSeparation(); });
on($('play-showcase'), 'click', action(play));
on($('replay-showcase'), 'click', action(async () => { partsOpen(false, false); detailsOpen(false); await ensureTour(); await invoke('seekTour', { seconds: 0 }); await invoke('resumeTour'); }));
on($('explore-freely'), 'click', action(async () => { await invoke('exitTour', { restore: false }); message('Explore the assembly. Select a part to inspect its structure.'); }));
on($('showcase-progress'), 'input', () => { scrubbing = true; const t = Number($('showcase-progress').value); $('elapsed-time').textContent = clock(t); $('showcase-progress').style.setProperty('--progress', `${t / (tour?.duration || 20) * 100}%`); });
on($('showcase-progress'), 'change', action(async () => { const seconds = Number($('showcase-progress').value); try { await ensureTour(); await invoke('seekTour', { seconds }); } finally { scrubbing = false; } }));
on($('retry'), 'click', action(async () => { $('retry').hidden = true; $('connection-message').textContent = 'Preparing Open Duck Mini…'; await mount(); }));
on(window, 'pagehide', event => { if (event.persisted) return; const active = client; client = null; abort.abort(); if (active) active.request('dispose', {}, { timeoutMs: 1000 }).catch(() => {}).finally(() => active.close()); });
palette();
void mount();
