import test from 'node:test';
import assert from 'node:assert/strict';
import { createShowcaseSessions } from '../../src/showcase/session.js';
import { DEFAULT_VIEWER_PREFERENCES, supportedViewerPreferences } from '../../src/showcase/preferences.js';
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const tick = () => new Promise(done => setImmediate(done));

test('rapid Duck → Hexapod → Dropbear waits for teardown and never mounts the superseded robot', async () => {
  const cleanup = deferred(), events = []; let liveScenes = 0, maximumScenes = 0;
  const manager = createShowcaseSessions({
    create:id => ({ id, mounted:false, nodes:new Map(), expanded:new Set(), selected:null, tour:null, busy:false, pending:null }),
    dispose:async session => { events.push(`dispose:${session.id}`); if (session.id === 'open-duck') await cleanup.promise; if (session.mounted) liveScenes--; }
  });
  const mount = async session => { await session.ready; manager.assertCurrent(session); session.mounted = true; liveScenes++; maximumScenes = Math.max(maximumScenes, liveScenes); events.push(`mount:${session.id}`); };
  const duck = manager.begin('open-duck'); await mount(duck); duck.nodes.set('head', {}); duck.selected = 'head'; duck.busy = true; duck.pending = .6;
  const hexapod = manager.begin('hexapod'), hexReady = mount(hexapod);
  const dropbear = manager.begin('dropbear'), dropReady = mount(dropbear);
  const cancelledHex = assert.rejects(hexReady, error => error.name === 'AbortError');
  await tick(); assert.equal(liveScenes, 1, 'incoming renderers wait for outgoing disposal');
  assert.equal(duck.abort.signal.aborted, true); assert.equal(hexapod.abort.signal.aborted, true);
  cleanup.resolve(); await cancelledHex; await dropReady;
  assert.deepEqual(events, ['mount:open-duck','dispose:open-duck','dispose:hexapod','mount:dropbear']);
  assert.equal(maximumScenes, 1);
  assert.equal(dropbear.nodes.size, 0); assert.equal(dropbear.expanded.size, 0); assert.equal(dropbear.selected, null); assert.equal(dropbear.tour, null); assert.equal(dropbear.busy, false); assert.equal(dropbear.pending, null);
  await manager.close(); assert.equal(liveScenes, 0); assert.equal(manager.current, null);
});

test('late hydration, selection and separation completions cannot commit into a replacement session', async () => {
  const manager = createShowcaseSessions(), old = manager.begin('open-duck'); await old.ready;
  const pending = ['hydration', 'selection', 'separation'].map(kind => ({ kind, ...deferred() }));
  const commits = [], completions = pending.map(({ kind, promise }) => manager.guard(old, () => promise).then(value => { commits.push([kind, value]); }));
  const current = manager.begin('hexapod'); await current.ready;
  pending.forEach(item => item.resolve({ node:'old-head' }));
  for (const completion of completions) await assert.rejects(completion, error => error.name === 'AbortError');
  assert.deepEqual(commits, []); assert.equal(manager.isCurrent(current), true);
  assert.throws(() => manager.assertCurrent(old), error => error.name === 'AbortError');
  await manager.close();
});

test('old errors and finally handlers stay scoped while the current action remains busy', async () => {
  const manager = createShowcaseSessions({ create:id => ({ id, busy:true }) });
  const previous = manager.begin('open-duck'); await previous.ready; const request = deferred(); let visibleError = null;
  const action = (async () => {
    try { await manager.guard(previous, () => request.promise); }
    catch (error) { if (manager.isCurrent(previous)) visibleError = error.message; }
    finally { if (manager.isCurrent(previous)) previous.busy = false; }
  })();
  const current = manager.begin('dropbear'); await current.ready; request.reject(new Error('Old network failure')); await action;
  assert.equal(visibleError, null); assert.equal(current.busy, true); assert.equal(manager.isCurrent(current), true);
  await manager.close();
});

test('closing a pending session prevents its mount, and teardown failure does not block the next robot', async () => {
  const cleanup = deferred(); const disposed = [];
  const manager = createShowcaseSessions({ create:id => ({ id }), dispose:async s => { disposed.push(s.id); if (s.id === 'first') { await cleanup.promise; throw new Error('Transport already gone'); } } });
  const first = manager.begin('first'); await first.ready;
  const second = manager.begin('second'); const closed = manager.close();
  cleanup.resolve(); await assert.rejects(second.ready, error => error.name === 'AbortError'); await closed;
  const third = manager.begin('third'); await third.ready; assert.equal(manager.isCurrent(third), true);
  await manager.close(); assert.deepEqual(disposed, ['first','second','third']);
});

const capabilities = { displayOptions:{ appearances:['light','dark'] }, customAccent:true, themes:['ember','arc-cyan'], qualityProfiles:['balanced','performance','quality'], renderStyles:{ enabled:['engineering','linework','flat'] } };
test('viewer choices survive scene replacement independently of model and tour state', async () => {
  let preference = { ...DEFAULT_VIEWER_PREFERENCES };
  const manager = createShowcaseSessions({ create:id => ({ id, preference:{ ...preference }, selected:null, tour:null }) });
  const duck = manager.begin('open-duck'); await duck.ready;
  preference = { ...preference, themeId:'custom', accent:'#49e9ff', appearance:'dark', grid:false, quality:'performance', renderStyle:'linework' };
  const hexapod = manager.begin('hexapod'); await hexapod.ready;
  assert.deepEqual(supportedViewerPreferences(hexapod.preference, capabilities), {
    display:{ grid:false, appearance:'dark' }, theme:{ themeId:'custom', accent:'#49e9ff' }, quality:'performance', renderStyle:'linework'
  });
  assert.equal(hexapod.selected, null); assert.equal(hexapod.tour, null);
  const restricted = structuredClone(capabilities); restricted.customAccent = false; restricted.qualityProfiles = ['balanced']; restricted.renderStyles.enabled = ['engineering'];
  assert.deepEqual(supportedViewerPreferences(preference, restricted), { display:{ grid:false, appearance:'dark' }, theme:null, quality:null, renderStyle:null });
  const dropbear = manager.begin('dropbear'); await dropbear.ready;
  assert.deepEqual(supportedViewerPreferences(dropbear.preference, capabilities), supportedViewerPreferences(hexapod.preference, capabilities), 'unsupported options do not erase the user’s original choices');
  assert.deepEqual(DEFAULT_VIEWER_PREFERENCES, { themeId:'ember', accent:'#ff6840', appearance:'light', grid:true, quality:'balanced', renderStyle:'engineering' });
  await manager.close();
});
