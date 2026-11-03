import { MODEL_CATALOG } from '../explorer/model-catalog.js';
import { buildHierarchy } from '../explorer/model-state.js';
import { AssemblyScene } from '../explorer/scene.js';
import { sampleTour } from '../explorer/tour-content.js';
import { themeRoles, resolveTheme } from '../explorer/themes.js';
import { SHOWCASES, resolveShowcase } from '../showcase/registry.js';
import { createWebM } from './webm.js';

const $ = id => document.getElementById(id), width = 960, height = 600, fps = 30;
const output = $('preview'), ctx = output.getContext('2d', { alpha: false });
let showcase, model, scene, tour, cancelled = false, rendering = false, preparing = false, capturing = false;
let generation = 0, pendingMetadata = null;
const status = value => { $('status').textContent = value; };
function download(bytes, type, name) {
  const url = URL.createObjectURL(new Blob([bytes], { type })), link = document.createElement('a');
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function fitText(text, x, y, maxWidth, { font = 9, family = 'monospace', minimum = 7 } = {}) {
  let size = font;
  do { ctx.font = `${size}px ${family}`; if (ctx.measureText(text).width <= maxWidth) break; size -= .25; } while (size >= minimum);
  ctx.fillText(text, x, y, maxWidth);
}
function overlay(frame) {
  const dark = scene.displayOptions.appearance === 'dark';
  const background = dark ? '#1b1b1b' : '#f3f3f1', ink = dark ? '#dedede' : '#282b2d';
  ctx.fillStyle = background; ctx.fillRect(0, 0, width, 65); ctx.fillRect(0, height - 75, width, 75);
  ctx.fillStyle = ink; ctx.font = '600 13px Arial'; ctx.fillText(`ANNORA / ${showcase.shortTitle.toUpperCase()}`, 28, 32);
  ctx.font = '10px monospace'; ctx.fillText(`ASSEMBLY STUDY · ${showcase.studyNumber}`, 28, 48);
  ctx.strokeStyle = dark ? '#44474a' : '#d1d2d0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(28, 64); ctx.lineTo(932, 64); ctx.stroke();
  const x = 733, y = 184; ctx.fillStyle = dark ? '#242629ee' : '#ffffffee'; ctx.fillRect(x, y, 198, 168); ctx.strokeRect(x + .5, y + .5, 197, 167);
  ctx.fillStyle = '#ff6840'; ctx.font = '12px monospace';
  ctx.fillText(`${String(frame.index + 1).padStart(2, '0')} / ${String(tour.chapters.length).padStart(2, '0')}`, x + 16, y + 26);
  ctx.fillStyle = ink; ctx.font = '500 21px Arial';
  const words = frame.title.split(' '); let line = '', row = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > 166 && line) { ctx.fillText(line, x + 16, y + 58 + row * 25); row++; line = word; }
    else line = candidate;
  }
  ctx.fillText(line, x + 16, y + 58 + row * 25);
  ctx.fillStyle = dark ? '#c2c4c5' : '#666b6e'; fitText(showcase.title, x + 16, y + 146, 166, { font: 11, family: 'Arial', minimum: 9 });
  ctx.fillStyle = dark ? '#c2c4c5' : '#62666a'; fitText(frame.caption || 'Explore the assembly.', 28, height - 48, width - 56, { font: 11, family: 'Arial', minimum: 9 });
  ctx.fillStyle = dark ? '#44474a' : '#d3d4d1'; ctx.fillRect(28, height - 28, width - 56, 2);
  ctx.fillStyle = '#ff6840'; ctx.fillRect(28, height - 28, (width - 56) * frame.time / tour.duration, 2);
  ctx.fillStyle = dark ? '#999c9f' : '#74787b'; fitText(showcase.attribution, 28, height - 10, width - 56);
}
function draw(time) {
  const frame = sampleTour(tour, time); scene.applyTourFrame(frame, { immediate: time === 0 });
  scene.dirty = true; scene.frame(time * 1000); ctx.drawImage(scene.renderer.domElement, 0, 0, width, height); overlay(frame); return frame;
}
function reset() {
  scene.pausePresentation(); scene.leaveTour(); scene.controls.enabled = false; scene.lastFrame = null;
  scene.applyTourFrame(sampleTour(tour, 0), { immediate: true }); draw(0);
}
function updateControls() {
  const ready = Boolean(scene?.ready && tour);
  $('prepare').disabled = preparing || rendering || capturing || !model;
  $('model-select').disabled = preparing || rendering || capturing;
  $('still').disabled = !ready || preparing || rendering || capturing; $('film').disabled = !ready || preparing || rendering || capturing;
  $('cancel').disabled = !rendering; $('time').disabled = preparing || rendering || capturing;
  $('film').textContent = `Render ${tour?.duration || model?.tour?.duration || ''}-second film`.replace('Render -second', 'Render');
}
function choose(search = location.search) {
  generation++; pendingMetadata?.abort(); pendingMetadata = null;
  scene?.dispose(); scene = null; tour = null; cancelled = true;
  ctx.fillStyle = '#f3f3f1'; ctx.fillRect(0, 0, width, height);
  try {
    showcase = resolveShowcase(search); model = MODEL_CATALOG[showcase.modelId];
    if (!model || model.tour?.id !== showcase.tourId) throw new Error('This showcase does not have a registered model and matching tour.');
    document.title = `${showcase.shortTitle} · Media export`; $('export-title').textContent = `${showcase.title} media export`;
    $('model-select').value = showcase.id; $('back-to-showcase').href = `../showcase/?model=${encodeURIComponent(showcase.id)}`;
    $('time').max = model.tour.duration; $('time').value = Math.min(1, model.tour.duration);
    status('Prepare the model to begin.');
  } catch (error) { model = null; status(error.message); $('export-title').textContent = 'Showcase unavailable'; }
  updateControls();
}
async function prepare() {
  if (preparing || rendering || !model) return;
  const version = generation; preparing = true; updateControls(); status('Loading prepared geometry and linework…');
  try {
    if (!scene) {
      pendingMetadata = new AbortController();
      const response = await fetch(model.metadataUrl, { signal: pendingMetadata.signal });
      if (!response.ok) throw new Error('Model metadata is unavailable.');
      const metadata = await response.json(); if (version !== generation) return;
      tour = model.tour;
      scene = new AssemblyScene($('source'), metadata, buildHierarchy(metadata, model.presentationPolicy), {
        theme: themeRoles(resolveTheme('ember'), 'light'), axisElements: [], insets: () => ({ left: 24, right: 238, top: 82, bottom: 78 }),
      }, model);
      await scene.load(); scene.setDisplayOptions({ appearance: 'light', grid: true }); await scene.prepareEdges(); scene.setQuality('performance');
      if (version !== generation) return;
      // This authoring scene temporarily gives its existing clock to fixed-frame capture.
      if (scene.raf !== null) cancelAnimationFrame(scene.raf); scene.raf = null;
      scene.invalidate = () => { scene.dirty = true; }; scene.controls.enabled = false;
    }
    reset(); status('Ready. Frame-accurate capture uses the live model and authored tour.');
  } catch (error) {
    if (version === generation) { scene?.dispose(); scene = null; tour = null; status(error.message); }
  } finally { if (version === generation) { pendingMetadata = null; preparing = false; updateControls(); } }
}
for (const item of SHOWCASES) {
  const option = document.createElement('option'); option.value = item.id; option.textContent = item.title; $('model-select').append(option);
}
$('model-select').addEventListener('change', () => {
  const url = new URL(location.href); url.searchParams.set('model', $('model-select').value); history.replaceState(null, '', url); choose(url.search);
});
$('prepare').addEventListener('click', prepare);
$('still').addEventListener('click', async () => {
  if (capturing || rendering || preparing || !scene?.ready || !tour) return;
  const version = generation, identity = showcase.id; capturing = true; updateControls();
  try {
    const time = Math.max(0, Math.min(tour.duration, Number($('time').value) || 0)); reset();
    for (let i = 0; i <= Math.ceil(time * fps); i++) draw(Math.min(time, i / fps));
    const blob = await new Promise(resolve => output.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('The frame could not be captured.');
    const bytes = await blob.arrayBuffer(); if (version !== generation) return;
    download(bytes, 'image/png', `${identity}-${time.toFixed(1)}s.png`); status('PNG saved.');
  } catch (error) { if (version === generation) status(error.message); }
  finally { if (version === generation) { capturing = false; updateControls(); } }
});
$('cancel').addEventListener('click', () => { cancelled = true; });
$('film').addEventListener('click', async () => {
  if (rendering || !scene?.ready || !tour) return;
  const version = generation, identity = showcase.id; rendering = true; cancelled = false; updateControls(); let encoder;
  try {
    if (!globalThis.VideoEncoder) throw new Error('Use a browser with WebCodecs video encoding for this authoring tool.');
    const config = { codec: 'vp8', width, height, bitrate: 3500000, framerate: fps, latencyMode: 'quality' };
    if (!(await VideoEncoder.isConfigSupported(config)).supported) throw new Error('VP8 video encoding is unavailable in this browser.');
    const frames = []; let encodingError;
    encoder = new VideoEncoder({ output: chunk => { const data = new Uint8Array(chunk.byteLength); chunk.copyTo(data); frames.push({ data, timestamp: chunk.timestamp, key: chunk.type === 'key' }); }, error: error => { encodingError = error; } }); encoder.configure(config);
    reset(); const count = Math.round(tour.duration * fps);
    for (let i = 0; i < count; i++) {
      if (cancelled || version !== generation) throw new Error('Capture cancelled.');
      if (document.hidden) throw new Error('Capture stopped: keep this authoring tab visible, then render again.');
      if (encodingError) throw encodingError;
      draw(i / fps); const frame = new VideoFrame(output, { timestamp: Math.round(i / fps * 1e6), duration: Math.round(1e6 / fps) });
      try { encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 }); } finally { frame.close(); }
      if (encoder.encodeQueueSize > 8) await encoder.flush();
      if (i % 10 === 0) { status(`Rendering ${i + 1} / ${count} frames…`); await new Promise(resolve => setTimeout(resolve, 0)); }
    }
    await encoder.flush(); if (encodingError) throw encodingError;
    if (cancelled || document.hidden || version !== generation) throw new Error('Capture stopped. Keep this tab visible and render again.');
    download(createWebM({ width, height, fps, duration: tour.duration, frames }), 'video/webm', `annora-${identity}-showcase.webm`);
    status(`Saved ${frames.length} frames at ${fps} fps. Duration ${tour.duration} seconds.`); draw(tour.duration);
  } catch (error) { if (version === generation) status(error.message); }
  finally { if (encoder && encoder.state !== 'closed') encoder.close(); if (version === generation) { rendering = false; updateControls(); } }
});
addEventListener('pagehide', event => {
  cancelled = true;
  if (event.persisted) return;
  generation++; pendingMetadata?.abort(); scene?.dispose();
});
choose();
