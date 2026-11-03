import { SHOWCASES, resolveShowcase, resolveShowcaseMedia } from '../showcase/registry.js';

const $ = id => document.getElementById(id);
for (const item of SHOWCASES) {
  const option = document.createElement('option'); option.value = item.id; option.textContent = item.title; $('model-select').append(option);
}
function render() {
  const video = $('film'); video.pause(); video.removeAttribute('src'); video.removeAttribute('poster'); video.load();
  try {
    const showcase = resolveShowcase(location.search), media = resolveShowcaseMedia(showcase) || {};
    document.title = `${showcase.shortTitle} · Film & keyframes`; $('identity').textContent = `ANNORA / ${showcase.shortTitle.toUpperCase()}`;
    $('model-select').value = showcase.id; $('back-to-showcase').href = `../?model=${encodeURIComponent(showcase.id)}`;
    $('media-title').textContent = `Inside ${showcase.shortTitle}.`;
    $('description').textContent = `A silent presentation from the same prepared ${showcase.title} model and authored timeline as the live Explorer. Pause the film or open the interactive scene to take control.`;
    $('credits').textContent = showcase.attribution;
    if (media.film) { video.src = media.film; if (media.hero) video.poster = media.hero; }
    video.hidden = !media.film;
    $('media-state').hidden = Boolean(media.film); $('media-state').textContent = 'The media for this robot is being prepared. Open its interactive showcase to explore the assembly.';
    for (const field of ['film', 'gif']) {
      const link = $(`download-${field}`); link.hidden = !media[field];
      if (media[field]) { link.href = media[field]; link.download = `annora-${showcase.id}.${field === 'film' ? 'mp4' : 'gif'}`; } else link.removeAttribute('href');
    }
    const frames = [
      ['hero', '01 / The whole assembly', `The assembled ${showcase.title} on a pale technical stage`],
      ['exploded', '02 / Connected layers', `${showcase.title} modules separated to show their structural relationship`],
      ['detail', '03 / Technical detail', `${showcase.title} in crisp linework with selective flat Ember emphasis`],
    ];
    for (const [field, label, alt] of frames) {
      const figure = $(`frame-${field}`), link = $(`${field}-link`), img = figure.querySelector('img');
      figure.hidden = !media[field]; img.removeAttribute('src'); img.alt = alt; figure.querySelector('figcaption').textContent = label;
      if (media[field]) { img.src = media[field]; link.href = media[field]; link.download = `${showcase.id}-${field}.png`; } else link.removeAttribute('href');
    }
    $('media-spec').textContent = ''; $('source-link').href = showcase.sourceUrl;
  } catch (error) {
    $('media-title').textContent = 'Showcase unavailable'; $('description').textContent = error.message;
    $('media-state').hidden = true; $('downloads').hidden = true; $('frames').hidden = true;
  }
}
$('model-select').addEventListener('change', () => {
  const url = new URL(location.href); url.searchParams.set('model', $('model-select').value); location.href = url.href;
});
$('film').addEventListener('loadedmetadata', () => { const video = $('film'); $('media-spec').textContent = `${video.videoWidth} × ${video.videoHeight} · ${video.duration} seconds · silent`; });
$('film').addEventListener('error', () => { $('media-state').hidden = false; $('media-state').textContent = 'The film could not be loaded. Retry this page or open the interactive showcase.'; });
render();
