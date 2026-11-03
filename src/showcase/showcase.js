import { createExplorerClient } from '../explorer/embed-client.js';
import { CLIENT_THEMES, resolveTheme, applyThemeTokens } from '../explorer/themes.js';
import { SHOWCASES, SHOWCASE_REGISTRY, resolveShowcase, showcaseTitle, chapterPresentation } from './registry.js';
import { createShowcaseSessions } from './session.js';
import { DEFAULT_VIEWER_PREFERENCES, supportedViewerPreferences } from './preferences.js';

const $ = id => document.getElementById(id);
const icons = name => { const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); const use = document.createElementNS(el.namespaceURI, 'use'); use.setAttribute('href', `#i-${name}`); el.append(use); return el; };
const clock = value => `${String(Math.floor(Math.max(0, value || 0) / 60)).padStart(2, '0')}:${String(Math.floor(Math.max(0, value || 0)) % 60).padStart(2, '0')}`;
const seconds = value => Number.isFinite(value) ? `${Number(value.toFixed(1))} s` : '';
const typeNames = { assembly:'Whole assembly', system:'Assembly', subassembly:'Subassembly', component:'Source component' };
const abort = new AbortController();
const on = (target, type, work, options = {}) => target.addEventListener(type, work, { ...options, signal:abort.signal });
let currentAccent = resolveTheme('ember'), currentAppearance = 'light', paletteKey = null;
let viewerPreference = { ...DEFAULT_VIEWER_PREFERENCES }, selectionVersion = 0;

function disposeSession(s) {
  if (s.disposal) return s.disposal;
  s.disposal = (async () => {
  let timer;
  try {
    if (s.client?.sessionId) await Promise.race([
      s.client.request('dispose', {}, { timeoutMs:800 }).catch(() => {}),
      new Promise(resolve => { timer = setTimeout(resolve, 1000); })
    ]);
  } finally { clearTimeout(timer); s.unsubscribe?.(); s.client?.close(); s.iframe?.remove(); }
  })(); return s.disposal;
}
const sessions = createShowcaseSessions({
  create:showcase => ({ showcase, client:null, iframe:null, state:null, capabilities:null, rootId:showcase.modelId, tour:null,
    hydrated:false, hydrating:false, connected:false, busy:false, failed:false, requestVersion:0,
    nodes:new Map(), children:new Map(), expanded:new Set(), treeQuery:'', selectedRequest:null, selectionKey:null, treeSelection:null,
    scrubbing:false, separating:false, separationRequest:null, separationPending:null,
    preference:{ ...viewerPreference } }),
  dispose:disposeSession
});
const active = () => sessions.current;
const owns = s => Boolean(s && sessions.isCurrent(s));
function message(text, error = false) { $('action-message').textContent = text; $('action-message').hidden = !text; $('action-message').dataset.error = String(error); }
function palette(theme = currentAccent, appearance = currentAppearance) {
  currentAccent = theme; currentAppearance = appearance;
  const key = `${theme.id}:${theme.accent}:${appearance}`; if (paletteKey === key) return; paletteKey = key;
  document.documentElement.dataset.appearance = appearance; applyThemeTokens(theme, document.documentElement, appearance);
  document.querySelector('meta[name="theme-color"]').content = appearance === 'dark' ? '#1b1b1b' : '#f3f3f1';
  for (const button of document.querySelectorAll('button[data-appearance]')) button.setAttribute('aria-pressed', String(button.dataset.appearance === appearance));
  for (const button of document.querySelectorAll('[data-accent]')) button.setAttribute('aria-pressed', String(button.dataset.accent === theme.id));
  $('custom-accent').value = theme.accent;
}
async function invoke(method, params = {}, s = active(), connection = s?.client) {
  sessions.assertCurrent(s);
  if (!connection || connection !== s.client) throw new Error('The assembly is not connected yet.');
  const result = await sessions.guard(s, () => connection.request(method, params));
  if (connection !== s.client) throw new DOMException('The assembly connection changed.', 'AbortError');
  if (result.payload.status === 'failed') throw Object.assign(new Error(result.payload.error.message), { code:result.payload.error.code });
  return result.payload.status === 'cancelled' ? null : result.payload.result;
}
function action(work, { lock = true, owner = null } = {}) {
  return async event => {
    const s = owner || active(); if (!owns(s) || s.failed || lock && s.busy) return;
    const version = ++s.requestVersion; if (lock) { s.busy = true; drawControls(s); } message('');
    try { await work(event, s); }
    catch (error) { if (owns(s) && version === s.requestVersion && error.name !== 'AbortError') message(error.message || 'This action could not finish. Please try again.', true); }
    finally { if (lock && owns(s) && version === s.requestVersion) { s.busy = false; drawControls(s); } }
  };
}
function menusClose(except = null) { for (const menu of document.querySelectorAll('.settings-menu')) if (menu !== except) menu.open = false; }
function partsOpen(value, focus = true) {
  $('parts-panel').hidden = !value; $('parts-toggle').setAttribute('aria-expanded', String(value)); document.body.dataset.partsOpen = String(value);
  if (value) { detailsOpen(false); if (focus && !matchMedia('(max-width:760px)').matches) $('parts-search').focus({ preventScroll:true }); }
  else if (focus) $('parts-toggle').focus({ preventScroll:true });
}
function detailsOpen(value) {
  $('detail-panel').dataset.open = String(value); $('details-toggle').setAttribute('aria-expanded', String(value)); document.body.dataset.detailsOpen = String(value);
  if (value) partsOpen(false, false);
}
function drawControls(s = active()) {
  if (s && !owns(s)) return;
  const state = s?.state, caps = s?.capabilities, busy = Boolean(s?.busy || s?.hydrating);
  const ready = Boolean(s?.connected && s.hydrated && !s.failed && state?.lifecycle === 'ready');
  const tourActive = state?.tour?.active, status = state?.tour?.status;
  $('play-showcase').disabled = !ready || !s?.tour || busy;
  $('play-showcase').querySelector('span').textContent = busy ? 'Preparing…' : !tourActive ? 'Play showcase' : status === 'playing' ? 'Pause' : status === 'completed' ? 'Replay showcase' : 'Resume';
  $('play-showcase').querySelector('use').setAttribute('href', status === 'playing' && !busy ? '#i-pause' : '#i-play');
  $('replay-showcase').disabled = !ready || !s?.tour || busy; $('showcase-progress').disabled = !ready || !s?.tour || busy;
  $('explore-freely').disabled = !ready || busy || !tourActive;
  for (const id of ['parts-toggle','details-toggle','reset-view','back-assembly','inspect-selection']) $(id).disabled = !ready || busy;
  $('isolate-selection').disabled = !ready || busy || state?.navigation?.selectedId === s?.rootId && !state?.navigation?.isolated;
  $('isolate-selection').textContent = state?.navigation?.isolated ? 'Show context' : 'Isolate';
  for (const element of document.querySelectorAll('button[data-style], button[data-appearance], [data-accent], #grid-option, #quality-option')) element.disabled = !ready || busy;
  $('custom-accent').disabled = !ready || busy || !caps?.customAccent;
  document.body.dataset.playing = String(Boolean(tourActive && status === 'playing')); document.body.dataset.touring = String(Boolean(tourActive));
  $('detail-panel').inert = Boolean(tourActive && status === 'playing');
  const assembly = Boolean(s?.nodes.get(state?.navigation?.scopeId)?.childIds?.length), canExplode = Boolean(caps?.modes.enabled.includes('explode'));
  $('manual-actions').hidden = Boolean(tourActive) || !ready;
  for (const id of ['separation-progress','separate-assembly']) $(id).disabled = !ready || busy || !assembly || !canExplode;
  $('restore-assembly').disabled = !ready || busy || !(state?.presentation?.explosion > .001 || state?.presentation?.mode === 'operate');
  const operating = state?.presentation?.mode === 'operate', operation = state?.operation, noun = s?.showcase.action.noun || 'action';
  $('play-motion').hidden = !caps?.operation?.enabled; $('motion-note').hidden = !caps?.operation?.enabled;
  $('play-motion').disabled = !ready || busy || !operation?.available;
  const duration = seconds(operation?.duration), suffix = duration ? ` · ${duration}` : '';
  $('play-motion').querySelector('span').textContent = operating && operation?.status === 'playing' ? `Pause ${noun}` : operating && operation?.progress > 0 && operation.progress < 1 ? `Resume ${noun}` : `${operating && operation?.progress >= 1 ? 'Replay' : 'Play'} ${noun}${suffix}`;
  $('play-motion').querySelector('use').setAttribute('href', operating && operation?.status === 'playing' ? '#i-pause' : '#i-play');
}
function currentBeat(s, time) {
  if (!s.tour?.chapters?.length) return -1;
  const found = s.tour.chapters.findIndex(chapter => time < chapter.start + chapter.duration - .001);
  return found < 0 ? s.tour.chapters.length - 1 : found;
}
function updateSelection(s, node) {
  if (!owns(s) || !node) return;
  const key = `${node.id}:${s.nodes.size}`;
  if (s.selectionKey !== key) {
    s.selectionKey = key; $('selected-title').textContent = node.title;
    $('selected-description').textContent = node.description || `A source component in the ${s.showcase.shortTitle} assembly.`;
    $('selected-kind').textContent = typeNames[node.kind] || 'Source component';
    const count = s.nodes.size, at = [...s.nodes.keys()].indexOf(node.id) + 1;
    $('selected-code').textContent = node.id === s.rootId ? '01 / ROOT' : `${String(at).padStart(2, '0')} / ${String(count).padStart(2, '0')}`;
    $('inspect-selection').querySelector('span').textContent = node.childIds?.length ? 'Inspect assembly' : 'Frame part';
  }
  $('isolate-selection').setAttribute('aria-pressed', String(Boolean(s.state?.navigation?.isolated)));
  if (s.treeSelection !== node.id) {
    s.treeSelection = node.id;
    for (const line of $('component-tree').querySelectorAll('.tree-line')) {
      const selected = line.dataset.node === node.id; line.classList.toggle('selected', selected);
      line.querySelector('.tree-select').setAttribute('aria-pressed', String(selected));
    }
  }
}
function fail(s, text) {
  if (!owns(s)) return;
  s.failed = true; s.busy = false; s.hydrating = false; $('connection-screen').hidden = false;
  $('connection-message').textContent = text; $('retry').hidden = false; $('view-status').textContent = 'Assembly unavailable';
  message(text, true); drawControls(s);
}
function draw(s, next) {
  if (!owns(s) || !next?.lifecycle || s.failed) return;
  if (next.model?.id && next.model.id !== s.showcase.modelId) {
    fail(s, 'The requested robot package is unavailable. Choose another robot or try again.');
    void disposeSession(s); return;
  }
  s.state = next; const ready = next.lifecycle === 'ready'; $('connection-screen').hidden = ready;
  if (next.lifecycle === 'error') { fail(s, `The ${s.showcase.shortTitle} assembly could not be loaded. Try again.`); return; }
  const nav = next.navigation || {}, view = next.presentation || {}, transport = next.tour || {}, display = next.appearance?.display || {};
  if (ready && s.hydrated) {
    const theme = next.appearance?.theme; palette(resolveTheme(theme?.id || currentAccent.id, theme?.accent || theme?.revision || currentAccent.accent), display.appearance || currentAppearance);
  }
  $('grid-option').checked = Boolean(display.grid); if (next.appearance?.quality) $('quality-option').value = next.appearance.quality;
  const styleTitle = { engineering:'Engineering', linework:'Linework', flat:'Flat highlight' }[view.renderStyle] || 'Engineering';
  $('display-label').textContent = styleTitle; $('selected-view').textContent = styleTitle;
  for (const b of document.querySelectorAll('[data-style]')) b.setAttribute('aria-pressed', String(b.dataset.style === view.renderStyle));
  const selection = s.nodes.get(nav.selectedId);
  if (selection) updateSelection(s, selection);
  else if (ready && nav.selectedId && s.selectedRequest !== nav.selectedId) {
    const id = nav.selectedId, connection = s.client; s.selectedRequest = id;
    invoke('getNode', { nodeId:id }, s, connection).then(node => { if (node && owns(s) && connection === s.client) { s.nodes.set(node.id, node); if (s.state?.navigation.selectedId === node.id) updateSelection(s, node); } }).catch(() => {}).finally(() => { if (owns(s) && connection === s.client && s.selectedRequest === id) s.selectedRequest = null; });
  }
  $('scope-name').textContent = nav.scopeId === s.rootId ? 'Whole assembly' : s.nodes.get(nav.scopeId)?.title || 'Inside assembly';
  const parent = s.nodes.get(s.nodes.get(nav.scopeId)?.parentId);
  $('back-assembly').hidden = !parent; $('back-assembly').querySelector('span').textContent = parent?.id === s.rootId ? 'Whole assembly' : parent?.title || 'Parent assembly';
  $('back-assembly').setAttribute('aria-label', `Back to ${parent?.title || 'parent assembly'}`); document.body.dataset.scoped = String(Boolean(parent));
  if (!s.separating) { const fraction = view.explosion || 0; $('separation-progress').value = fraction; $('separation-progress').style.setProperty('--progress', `${fraction * 100}%`); $('separation-value').textContent = `${Math.round(fraction * 100)}%`; }
  const duration = s.tour?.duration || transport.duration || 0, time = transport.active ? transport.time || 0 : 0;
  if (!s.scrubbing) { $('showcase-progress').value = time; $('showcase-progress').style.setProperty('--progress', `${duration ? Math.min(100, time / duration * 100) : 0}%`); }
  $('elapsed-time').textContent = clock(time);
  const beat = transport.active ? currentBeat(s, time) : -1, chapter = s.tour?.chapters[beat], copy = chapterPresentation(s.showcase, chapter);
  $('beat-number').textContent = beat < 0 ? 'READY TO EXPLORE' : `${String(beat + 1).padStart(2, '0')} / ${String(s.tour.chapters.length).padStart(2, '0')} · ${(chapter?.label || 'Showcase').toUpperCase()}`;
  $('beat-title').textContent = copy.title; $('beat-description').textContent = copy.description;
  $('view-status').textContent = !ready ? 'Preparing the assembly' : transport.active ? transport.status === 'playing' ? 'Showcase playing' : transport.status === 'completed' ? 'Presentation complete' : 'Showcase paused' : 'Free exploration';
  $('transport-state').textContent = !ready ? 'Preparing the assembly' : transport.reason === 'takeover' ? 'You have control. Resume when ready.' : transport.status === 'playing' ? chapter?.label || 'Playing the presentation' : transport.status === 'completed' ? 'Replay or explore the assembly' : transport.active ? 'Paused · drag the timeline to inspect' : 'One short presentation. Then take control.';
  for (const b of $('chapter-track').children) { if (transport.active && b.dataset.chapter === transport.chapterId) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); }
  drawControls(s);
}
async function loadTree(s, nodeId, connection) {
  const list = await invoke('getChildren', { nodeId }, s, connection); if (!Array.isArray(list)) return;
  s.children.set(nodeId, list.map(node => node.id)); for (const node of list) s.nodes.set(node.id, node);
  // Bound transport pressure even when a source has many subassemblies.
  for (const node of list) if (node.childIds?.length) await loadTree(s, node.id, connection);
}
function drawTree(s) {
  if (!owns(s)) return; const container = $('component-tree'); container.replaceChildren(); const search = s.treeQuery.toLowerCase().trim();
  const matches = node => node && (!search || node.title.toLowerCase().includes(search) || (s.children.get(node.id) || []).some(id => matches(s.nodes.get(id))));
  function row(node, parent) {
    if (!matches(node)) return;
    const item = document.createElement('div'); item.className = 'tree-item';
    const line = document.createElement('div'); line.className = 'tree-line'; line.dataset.node = node.id; line.classList.toggle('selected', s.state?.navigation?.selectedId === node.id);
    const hasChildren = (s.children.get(node.id) || []).length > 0, disclosure = document.createElement('button'); disclosure.type = 'button'; disclosure.className = 'tree-disclosure'; disclosure.setAttribute('aria-label', `${s.expanded.has(node.id) ? 'Collapse' : 'Expand'} ${node.title}`);
    if (hasChildren) { disclosure.append(icons('chevron')); disclosure.setAttribute('aria-expanded', String(s.expanded.has(node.id) || Boolean(search))); disclosure.addEventListener('click', () => { if (!owns(s)) return; if (s.expanded.has(node.id)) s.expanded.delete(node.id); else s.expanded.add(node.id); drawTree(s); }); }
    else { disclosure.disabled = true; disclosure.setAttribute('aria-hidden', 'true'); disclosure.tabIndex = -1; }
    const select = document.createElement('button'); select.type = 'button'; select.className = 'tree-select'; const label = document.createElement('span'); label.textContent = node.title; select.append(label);
    if (hasChildren) { const count = document.createElement('small'); count.textContent = String(node.childIds.length).padStart(2, '0'); select.append(count); }
    select.setAttribute('aria-pressed', String(s.state?.navigation?.selectedId === node.id));
    select.addEventListener('click', action(async (_, owner) => { await invoke('select', { nodeId:node.id }, owner); if (matchMedia('(max-width:760px)').matches) { partsOpen(false, false); detailsOpen(true); } }, { owner:s }));
    line.append(disclosure, select); item.append(line); parent.append(item);
    if (hasChildren && (s.expanded.has(node.id) || search)) { const sub = document.createElement('div'); sub.className = 'tree-children'; item.append(sub); for (const id of s.children.get(node.id)) row(s.nodes.get(id), sub); }
  }
  row(s.nodes.get(s.rootId), container);
  if (!container.childElementCount) { const note = document.createElement('p'); note.className = 'tree-empty'; note.textContent = 'No matching parts. Try another name.'; container.append(note); }
}
function buildTimeline(s) {
  if (!owns(s)) return; $('chapter-track').replaceChildren();
  for (const chapter of s.tour?.chapters || []) { const b = document.createElement('button'); b.type = 'button'; b.textContent = chapter.label; b.dataset.chapter = chapter.id; b.setAttribute('aria-label', `Inspect chapter: ${chapter.label}`); b.addEventListener('click', action(async (_, owner) => { await ensureTour(owner); await invoke('goToTourChapter', { chapterId:chapter.id }, owner); }, { owner:s })); $('chapter-track').append(b); }
  $('showcase-progress').max = s.tour?.duration || 0; $('duration-time').textContent = clock(s.tour?.duration || 0);
}
async function hydrate(s, connection) {
  if (!owns(s) || s.hydrated || s.hydrating || s.failed || connection !== s.client) return;
  s.hydrating = true; drawControls(s);
  try {
    s.capabilities = await invoke('getCapabilities', {}, s, connection);
    s.rootId = s.state.navigation.scopeId; const root = await invoke('getNode', { nodeId:s.rootId }, s, connection); s.nodes.set(root.id, root); s.expanded.add(root.id);
    await loadTree(s, s.rootId, connection); drawTree(s);
    const selectedTour = s.capabilities.tours.items.find(item => item.id === s.showcase.tourId);
    if (!selectedTour) throw new Error('The authored showcase is unavailable for this robot. Try again.');
    s.tour = await invoke('getTour', { tourId:selectedTour.id }, s, connection); buildTimeline(s);
    for (const button of document.querySelectorAll('[data-style]')) button.hidden = !s.capabilities.renderStyles.enabled.includes(button.dataset.style);
    for (const button of document.querySelectorAll('[data-accent]')) button.hidden = !s.capabilities.themes.includes(button.dataset.accent);
    for (const option of $('quality-option').options) option.hidden = !s.capabilities.qualityProfiles.includes(option.value);
    const preference = supportedViewerPreferences(s.preference, s.capabilities);
    await invoke('setDisplayOptions', { options:preference.display }, s, connection);
    if (preference.theme) await invoke('setTheme', preference.theme, s, connection);
    if (preference.quality) await invoke('setQuality', { profile:preference.quality }, s, connection);
    if (preference.renderStyle) await invoke('setRenderStyle', { style:preference.renderStyle }, s, connection);
    s.hydrated = true; s.hydrating = false; draw(s, await invoke('getState', {}, s, connection));
  } catch (error) { if (owns(s) && connection === s.client && error.name !== 'AbortError') fail(s, error.message); }
  finally { if (owns(s) && connection === s.client) { s.hydrating = false; drawControls(s); } }
}
function receive(s, event, connection) {
  if (!owns(s) || connection !== s.client || s.failed) return;
  if (['stateChanged','ready','helloAck'].includes(event.type)) { draw(s, event.payload?.state || event.payload); if (s.state?.lifecycle === 'ready') void hydrate(s, connection); }
  if (event.type === 'takeover') { partsOpen(false, false); message('You have control. Resume the showcase whenever you are ready.'); }
  if (event.type === 'error') fail(s, event.payload?.error?.message || event.payload?.message || 'The assembly could not finish this action.');
}
async function ensureTour(s) { if (!s.tour) throw new Error('The showcase is still being prepared.'); if (!s.state?.tour?.active) await invoke('startTour', { tourId:s.tour.id }, s); }
async function play(_, s) {
  partsOpen(false, false); detailsOpen(false); menusClose();
  if (!s.state?.tour?.active) await ensureTour(s);
  else if (s.state.tour.status === 'playing') await invoke('pauseTour', {}, s);
  else { if (s.state.tour.status === 'completed') await invoke('seekTour', { seconds:0 }, s); await invoke('resumeTour', {}, s); }
}
async function playMotion(_, s) {
  const operation = s.state.operation;
  if (s.state.presentation.mode === 'operate' && operation.status === 'playing') { await invoke('pauseOperation', {}, s); return; }
  await invoke('setOperationSpeed', { speed:1 }, s); await invoke('setFollowCamera', { enabled:false }, s);
  if (s.state.presentation.mode === 'operate' && operation.progress > 0 && operation.progress < 1) await invoke('playOperation', {}, s);
  else await invoke('replayOperation', {}, s);
}
async function flushSeparation(s) {
  if (!owns(s) || s.separationRequest) return; const connection = s.client;
  s.separationRequest = (async () => {
    try { while (owns(s) && s.separationPending !== null && connection === s.client) { const progress = s.separationPending; s.separationPending = null; await invoke('setExplosion', { progress, transition:'immediate' }, s, connection); } }
    catch (error) { if (owns(s) && error.name !== 'AbortError') message(error.message, true); }
    finally { if (owns(s) && connection === s.client) { s.separationRequest = null; if (!s.separating && s.state) draw(s, s.state); } }
  })(); await s.separationRequest;
}
function identity(showcase) {
  $('showcase-title').textContent = showcase.title; $('showcase-version').textContent = showcase.version || ''; $('study-label').textContent = `ASSEMBLY STUDY / ${showcase.studyNumber}`;
  $('showcase-select').value = showcase.id; document.title = `${showcase.title} · Annora Showcase`;
  document.querySelector('meta[name="description"]').content = `Explore ${showcaseTitle(showcase)}. ${showcase.description}`;
  $('model-stage').setAttribute('aria-label', `Interactive ${showcase.shortTitle} assembly`);
  $('selected-title').textContent = showcaseTitle(showcase); $('selected-description').textContent = showcase.description; $('selected-code').textContent = '01 / ROOT'; $('selected-kind').textContent = 'Whole assembly';
  $('transport-label').textContent = `${showcase.shortTitle.toUpperCase()} / SHOWCASE`; $('motion-note').textContent = showcase.action.note;
  $('beat-title').textContent = showcase.ready.title; $('beat-description').textContent = showcase.ready.description; $('beat-number').textContent = 'READY TO EXPLORE';
  $('source-link').href = showcase.sourceUrl; $('source-link').hidden = false;
  $('media-link').href = showcase.id === SHOWCASE_REGISTRY.defaultShowcaseId ? './media/' : `./media/?model=${encodeURIComponent(showcase.id)}`;
  $('media-link').hidden = !Object.keys(showcase.media).length;
}
function resetShell(showcase) {
  menusClose(); partsOpen(false, false); detailsOpen(false); $('manual-actions').open = false; $('manual-actions').hidden = true;
  $('parts-search').value = ''; $('component-tree').replaceChildren(); $('chapter-track').replaceChildren(); $('back-assembly').hidden = true;
  $('showcase-progress').value = 0; $('showcase-progress').max = 0; $('showcase-progress').style.setProperty('--progress','0%');
  $('elapsed-time').textContent = '00:00'; $('duration-time').textContent = '—'; $('scope-name').textContent = 'Whole assembly';
  $('separation-progress').value = 0; $('separation-value').textContent = '0%'; $('separation-progress').style.setProperty('--progress','0%');
  $('connection-screen').hidden = false; $('connection-message').textContent = `Preparing ${showcase.title}…`; $('retry').hidden = true; $('view-status').textContent = 'Preparing the assembly'; $('transport-state').textContent = 'Preparing the assembly';
  document.body.dataset.scoped = 'false'; message(''); identity(showcase); drawControls();
}
async function mount(showcase) {
  const s = sessions.begin(showcase); resetShell(showcase);
  try {
    await s.ready; sessions.assertCurrent(s);
    const url = new URL('../', location.href);
    for (const [key,value] of Object.entries({ model:showcase.modelId, embed:'1', chrome:'none', appearance:s.preference.appearance, theme:s.preference.themeId, parentOrigin:location.origin })) url.searchParams.set(key,value);
    if (s.preference.themeId === 'custom') url.searchParams.set('accent',s.preference.accent);
    const frame = document.createElement('iframe'); frame.title = `${showcaseTitle(showcase)} · Interactive 3D Explorer`; frame.allow = 'fullscreen'; s.iframe = frame;
    frame.addEventListener('load', () => {
      if (!owns(s)) return; s.unsubscribe?.(); s.client?.close(); s.connected = false; s.hydrated = false; s.hydrating = false; s.busy = false; s.requestVersion++;
      s.nodes.clear(); s.children.clear(); s.expanded.clear(); s.state = null; s.tour = null; s.capabilities = null; s.selectedRequest = null; s.selectionKey = null; s.treeSelection = null;
      s.scrubbing = false; s.separating = false; s.separationPending = null; s.separationRequest = null;
      const connection = createExplorerClient({ iframe:frame, origin:url.origin }); s.client = connection;
      s.unsubscribe = connection.subscribe(event => receive(s,event,connection));
      connection.ready.then(payload => { if (!owns(s) || s.client !== connection) return; s.connected = true; draw(s,payload.state); if (s.state?.lifecycle === 'ready') void hydrate(s,connection); }).catch(error => { if (owns(s) && s.client === connection && error.name !== 'AbortError') fail(s,error.message); });
    }, { signal:s.abort.signal });
    frame.src = url.href; $('explorer-mount').replaceChildren(frame); drawControls(s);
  } catch (error) { if (owns(s) && error.name !== 'AbortError') fail(s,error.message); }
}
async function choose(search, { historyMode } = {}) {
  const version = ++selectionVersion; let showcase;
  try { showcase = resolveShowcase(search); }
  catch (error) {
    await sessions.close(); if (version !== selectionVersion) return; $('explorer-mount').replaceChildren(); resetShell(SHOWCASES.find(item => item.id === SHOWCASE_REGISTRY.defaultShowcaseId));
    $('showcase-title').textContent = 'Choose a robot'; $('showcase-version').textContent = ''; $('showcase-select').value = ''; $('selected-title').textContent = 'No robot selected'; $('selected-description').textContent = 'Choose a robot from the model selector.';
    $('study-label').textContent = 'ASSEMBLY STUDY / —'; $('transport-label').textContent = 'SHOWCASE'; $('transport-state').textContent = 'Choose a robot';
    $('model-stage').setAttribute('aria-label', 'Assembly unavailable');
    $('connection-message').textContent = error.message; $('retry').hidden = true; $('source-link').hidden = true; $('media-link').hidden = true; $('view-status').textContent = 'Choose a robot'; $('beat-title').textContent = 'Choose a robot.'; $('beat-description').textContent = 'Select an available assembly to begin exploring.'; document.title = 'Choose a robot · Annora Showcase'; message(error.message,true); drawControls(); return;
  }
  if (historyMode) { const url = new URL(location.href); url.searchParams.set('model',showcase.id); history[historyMode === 'push' ? 'pushState' : 'replaceState'](null,'',url); }
  await mount(showcase);
}

function prefer(s, patch, method, params) {
  sessions.assertCurrent(s); viewerPreference = { ...viewerPreference, ...patch }; s.preference = { ...viewerPreference };
  return invoke(method, params, s);
}

for (const showcase of SHOWCASES) { const option = document.createElement('option'); option.value = showcase.id; option.textContent = showcaseTitle(showcase); $('showcase-select').append(option); }
for (const theme of CLIENT_THEMES) { const b = document.createElement('button'); b.type = 'button'; b.dataset.accent = theme.id; b.setAttribute('aria-pressed',String(theme.id === 'ember')); const swatch = document.createElement('i'); swatch.style.backgroundColor = theme.accent; swatch.setAttribute('aria-hidden','true'); b.append(swatch,document.createTextNode(theme.name)); b.addEventListener('click',action((_,s) => prefer(s,{themeId:theme.id,accent:theme.accent},'setTheme',{themeId:theme.id}))); $('accent-options').append(b); }
for (const b of document.querySelectorAll('[data-appearance]')) on(b,'click',action((_,s) => prefer(s,{appearance:b.dataset.appearance},'setDisplayOptions',{options:{appearance:b.dataset.appearance}})));
for (const b of document.querySelectorAll('[data-style]')) on(b,'click',action(async (_,s) => { await prefer(s,{renderStyle:b.dataset.style},'setRenderStyle',{style:b.dataset.style}); menusClose(); }));
for (const menu of document.querySelectorAll('.settings-menu')) on(menu,'toggle',() => { if (menu.open) { menusClose(menu); partsOpen(false,false); } });
on(document,'pointerdown',event => { if (!event.target.closest('.settings-menu')) menusClose(); });
on(document,'keydown',event => { if (event.key !== 'Escape') return; const menu = [...document.querySelectorAll('.settings-menu')].find(item => item.open); if (menu) { menu.open = false; menu.querySelector('summary').focus(); } else if (!$('parts-panel').hidden) partsOpen(false); else if ($('detail-panel').dataset.open === 'true') { detailsOpen(false); $('details-toggle').focus(); } });
on($('grid-option'),'change',action((_,s) => prefer(s,{grid:$('grid-option').checked},'setDisplayOptions',{options:{grid:$('grid-option').checked}})));
on($('quality-option'),'change',action((_,s) => prefer(s,{quality:$('quality-option').value},'setQuality',{profile:$('quality-option').value})));
on($('custom-accent'),'change',action((_,s) => prefer(s,{themeId:'custom',accent:$('custom-accent').value},'setTheme',{themeId:'custom',accent:$('custom-accent').value})));
on($('parts-toggle'),'click',action(async (_,s) => { const opening = $('parts-panel').hidden; if (opening && s.state.tour.status === 'playing') await invoke('pauseTour',{},s); partsOpen(opening); menusClose(); }));
on($('parts-close'),'click',() => partsOpen(false));
on($('parts-search'),'input',() => { const s = active(); if (owns(s)) { s.treeQuery = $('parts-search').value; drawTree(s); } });
on($('details-toggle'),'click',action(async (_,s) => { const opening = $('detail-panel').dataset.open !== 'true'; if (opening && s.state.tour.status === 'playing') await invoke('pauseTour',{},s); detailsOpen(opening); }));
on($('details-close'),'click',() => { detailsOpen(false); $('details-toggle').focus(); });
on($('reset-view'),'click',action(async (_,s) => { if (s.state.tour.active) await invoke('exitTour',{restore:false},s); await invoke('setMode',{mode:'explore'},s); await invoke('focus',{nodeId:s.rootId},s); await invoke('frame',{nodeId:s.rootId},s); }));
on($('back-assembly'),'click',action(async (_,s) => { const parentId = s.nodes.get(s.state.navigation.scopeId)?.parentId; if (parentId) await invoke('focus',{nodeId:parentId},s); }));
on($('inspect-selection'),'click',action((_,s) => invoke('focus',{nodeId:s.state.navigation.selectedId},s)));
on($('isolate-selection'),'click',action((_,s) => invoke('isolate',{nodeId:s.state.navigation.isolated ? null : s.state.navigation.selectedId},s)));
on($('separate-assembly'),'click',action((_,s) => invoke('setExplosion',{progress:1,transition:'animate'},s)));
on($('restore-assembly'),'click',action((_,s) => invoke('setMode',{mode:'explore'},s)));
on($('play-motion'),'click',action(playMotion));
on($('separation-progress'),'input',() => { const s = active(); if (!owns(s) || s.failed) return; s.separating = true; s.separationPending = Number($('separation-progress').value); $('separation-progress').style.setProperty('--progress',`${s.separationPending * 100}%`); $('separation-value').textContent = `${Math.round(s.separationPending * 100)}%`; void flushSeparation(s); });
on($('separation-progress'),'change',() => { const s = active(); if (owns(s)) { s.separating = false; void flushSeparation(s); } });
on($('play-showcase'),'click',action(play));
on($('replay-showcase'),'click',action(async (_,s) => { partsOpen(false,false); detailsOpen(false); await ensureTour(s); await invoke('seekTour',{seconds:0},s); await invoke('resumeTour',{},s); }));
on($('explore-freely'),'click',action(async (_,s) => { await invoke('exitTour',{restore:false},s); message('Explore the assembly. Select a part to inspect its structure.'); }));
on($('showcase-progress'),'input',() => { const s = active(); if (!owns(s)) return; s.scrubbing = true; const t = Number($('showcase-progress').value); $('elapsed-time').textContent = clock(t); $('showcase-progress').style.setProperty('--progress',`${s.tour?.duration ? t / s.tour.duration * 100 : 0}%`); });
on($('showcase-progress'),'change',action(async (_,s) => { const value = Number($('showcase-progress').value); try { await ensureTour(s); await invoke('seekTour',{seconds:value},s); } finally { if (owns(s)) s.scrubbing = false; } }));
on($('retry'),'click',() => { const s = active(); if (s) void mount(s.showcase); });
on($('showcase-select'),'change',() => { const params = new URLSearchParams(); params.set('model',$('showcase-select').value); void choose(params,{historyMode:'push'}); });
on(window,'popstate',() => { void choose(location.search); });
on(window,'pagehide',event => { if (event.persisted) return; abort.abort(); void sessions.close(); });
palette(); void choose(location.search);
