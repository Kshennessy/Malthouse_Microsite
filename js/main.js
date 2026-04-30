import { PanoViewer } from './viewer.js';
import { SCENES } from './data.js';

// ── Panorama viewer ──────────────────────────────────────────────
const canvas = document.getElementById('viewer-canvas');
const viewer = new PanoViewer(canvas);
window.viewer = viewer;

const placeholder = document.getElementById('tour-placeholder');
viewer.onPanoramaLoaded = () => {
  if (placeholder) placeholder.classList.add('hidden');
};

// ── Overlay open / close ─────────────────────────────────────────
const inlineViewer = document.getElementById('inline-viewer');
const expandBtn    = document.getElementById('viewer-expand');
const collapseBtn  = document.getElementById('viewer-collapse');
const badgeName    = document.getElementById('badge-scene-name');

function expandViewer() {
  if (!inlineViewer) return;
  inlineViewer.classList.add('is-expanded');
  document.body.classList.add('no-scroll', 'pano-open');
  if (collapseBtn) collapseBtn.hidden = false;
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event('resize'));
  });
}

function collapseViewer() {
  if (!inlineViewer) return;
  inlineViewer.classList.remove('is-expanded');
  document.body.classList.remove('no-scroll', 'pano-open');
  if (collapseBtn) collapseBtn.hidden = true;
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event('resize'));
  });
}

if (expandBtn)   expandBtn.addEventListener('click', expandViewer);
if (collapseBtn) collapseBtn.addEventListener('click', collapseViewer);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && inlineViewer && inlineViewer.classList.contains('is-expanded')) {
    collapseViewer();
  }
});

// ── Scene selector (inside overlay) ──────────────────────────────
// (scene selector removed — the isometric map is now the selector)

// ── Isometric map nodes ──────────────────────────────────────────
const mapEl   = document.getElementById('explorer-map');
const nodesEl = document.getElementById('explorer-nodes');

function buildMapNodes() {
  if (!nodesEl) return;
  nodesEl.innerHTML = '';
  SCENES.forEach(scene => {
    if (!scene.mapPos) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'map-node';
    btn.dataset.sceneId = scene.id;
    btn.style.left = scene.mapPos.x + '%';
    btn.style.top  = scene.mapPos.y + '%';
    btn.setAttribute('aria-label', scene.name);
    btn.innerHTML = `<span class="map-node-label">${scene.name}</span>`;
    btn.addEventListener('click', () => viewer.loadScene(scene.id));
    nodesEl.appendChild(btn);
  });
}

// ── Dev helper: click-to-place node positions ────────────────────
// Run `window.enableMapPlaceMode()` in the console, then click anywhere on
// the isometric — the { x, y } percentage logs for you to paste into data.js.
window.enableMapPlaceMode = () => {
  if (!mapEl) return;
  mapEl.classList.add('is-placing');
  const handler = e => {
    const rect = mapEl.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width)  * 100;
    const y = ((e.clientY - rect.top)  / rect.height) * 100;
    console.log(`mapPos: { x: ${x.toFixed(1)}, y: ${y.toFixed(1)} }`);
  };
  mapEl.addEventListener('click', handler);
  window.disableMapPlaceMode = () => {
    mapEl.classList.remove('is-placing');
    mapEl.removeEventListener('click', handler);
    console.log('Map place mode disabled.');
  };
  console.log('Map place mode enabled. Click anywhere on the isometric to log coordinates.');
  console.log('Run disableMapPlaceMode() to stop.');
};

// (label author mode removed — floating chips replaced by the equipment list)

buildMapNodes();

// ── Keep scene selector + overlay badge in sync ──────────────────
const captionEl = document.getElementById('viewer-caption');

function updateCaption(sceneId) {
  if (!captionEl) return;
  const scene = SCENES.find(s => s.id === sceneId);
  const text = (scene && scene.caption) ? scene.caption.trim() : '';
  if (text) {
    captionEl.textContent = text;
    captionEl.hidden = false;
  } else {
    captionEl.textContent = '';
    captionEl.hidden = true;
  }
}

viewer.onSceneChanged = (sceneId) => {
  const scene = SCENES.find(s => s.id === sceneId);
  if (scene && badgeName) badgeName.textContent = scene.name;
  if (placeholder) placeholder.classList.remove('hidden');
  updateCaption(sceneId);
};

// Manual initial sync — the viewer's first loadScene runs in its constructor,
// before onSceneChanged is set, so seed the caption for the default scene.
if (SCENES.length > 0) viewer.onSceneChanged(SCENES[0].id);

// ── Contact form ─────────────────────────────────────────────────
// (contact form removed — contact info is now plain mailto/tel links)

// ── Nav: solidify on scroll ──────────────────────────────────────
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// ── Sticky CTA: hide when contact section is visible ─────────────
const stickyCta  = document.getElementById('sticky-cta');
const contactSec = document.getElementById('contact');
if (stickyCta && contactSec) {
  const obs = new IntersectionObserver(
    ([entry]) => stickyCta.classList.toggle('hidden', entry.isIntersecting),
    { threshold: 0.08 }
  );
  obs.observe(contactSec);
}

// ── Hero strip: duplicate cells for seamless marquee ──
const stripTrack = document.querySelector('.strip-track');
if (stripTrack) {
  Array.from(stripTrack.children).forEach(cell => {
    const clone = cell.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    stripTrack.appendChild(clone);
  });
}

// ── Hero video: freeze on last frame, subtle scrim fade when it ends ──
const heroVideo = document.getElementById('hero-video');
if (heroVideo) {
  // iOS Low Power Mode will reject play() - keep poster visible in that case
  heroVideo.play().catch(() => {
    console.info('Hero video autoplay blocked (likely iOS Low Power Mode); poster shown');
  });
  heroVideo.addEventListener('ended', () => {
    heroVideo.classList.add('is-ended');
  });
}

// ── Tour video: Cloudflare Stream HLS playback ──
const tourVideo = document.getElementById('tour-video');
const tourPlay  = document.getElementById('video-play');

// Attach HLS source — native (Safari/iOS) or via hls.js (Chrome/Firefox/Edge)
if (tourVideo) {
  const hlsUrl = tourVideo.dataset.hls;
  if (hlsUrl) {
    if (tourVideo.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari + iOS — native HLS
      tourVideo.src = hlsUrl;
    } else {
      // Chrome/Firefox/Edge — wait for hls.js (deferred script) then attach
      const attachHls = () => {
        if (window.Hls && window.Hls.isSupported()) {
          const hls = new window.Hls();
          hls.loadSource(hlsUrl);
          hls.attachMedia(tourVideo);
        } else {
          console.warn('HLS not supported in this browser');
        }
      };
      if (window.Hls) attachHls();
      else window.addEventListener('load', attachHls, { once: true });
    }
  }
}

if (tourVideo && tourPlay) {
  tourPlay.addEventListener('click', () => {
    tourVideo.controls = true;
    tourVideo.play().catch(err => console.warn('Tour video play failed:', err));
    tourPlay.hidden = true;
  });
  tourVideo.addEventListener('ended', () => {
    tourVideo.controls = false;
    tourVideo.currentTime = 0;
    tourPlay.hidden = false;
  });
}

// ── Hotspot author panel (dev tool) ──
// Toggle with window.enablePanoAuthorMode() or Alt+H while panorama overlay is open.
// Click in the panorama to place a hotspot, fill the form, press Save. Copy JSON when done.
(function initHotspotAuthor() {
  let pending = null;
  let panel = null;

  function buildPanel() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'hotspot-author';
    panel.innerHTML = `
      <div class="ha-head">
        <span class="ha-title">Hotspot author</span><button type="button" id="ha-capture-view" class="ha-btn-link ha-capture" title="Copy current camera angles as scene default">Set as default view</button>
        <button type="button" class="ha-close" aria-label="Close">&times;</button>
      </div>
      <p class="ha-hint">Click in the panorama to place a hotspot.</p>
      <div class="ha-form" hidden>
        <label>Title
          <input type="text" id="ha-title" placeholder="e.g. Six-drum Schulz system">
        </label>
        <label>Detail rows <small>(one per line; prefix ~ for muted; __ for divider)</small>
          <textarea id="ha-rows" rows="6" placeholder="Capacity&#10;~2,000 tons / year&#10;__&#10;Manufacturer&#10;~Kaspar Schulz"></textarea>
        </label>
        <div class="ha-actions">
          <button type="button" id="ha-save" class="ha-btn ha-btn-primary">Save hotspot</button>
          <button type="button" id="ha-cancel" class="ha-btn">Cancel</button>
        </div>
      </div>
      <div class="ha-list-wrap">
        <div class="ha-list-head">
          <span>Placed in this pano</span>
          <button type="button" id="ha-export" class="ha-btn-link">Copy JSON</button>
        </div>
        <ol class="ha-list" id="ha-list"></ol>
      </div>
    `;
    document.body.appendChild(panel);

    panel.querySelector('.ha-close').onclick = disable;
    panel.querySelector('#ha-cancel').onclick = () => { pending = null; showForm(false); };
    panel.querySelector('#ha-save').onclick = () => {
      if (!pending) return;
      const title = document.getElementById('ha-title').value.trim() || 'Untitled';
      const rows  = document.getElementById('ha-rows').value
        .split(/\n/).map(s => s.trim()).filter(Boolean);
      window.viewer.addHotspot({ ...pending, title, rows });
      pending = null;
      showForm(false);
      refreshList();
    };
    panel.querySelector('#ha-export').onclick = async () => {
      const hotspots = window.viewer.exportHotspots();
      const json = JSON.stringify(hotspots, null, 2);
      try { await navigator.clipboard.writeText(json); } catch {}
      console.group('Hotspots for scene: ' + window.viewer.getCurrentSceneId());
      console.log(json);
      console.groupEnd();
      const btn = panel.querySelector('#ha-export');
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1200);
    };
    panel.querySelector('#ha-capture-view').onclick = async () => {
      const angles = window.viewer.getCameraAngles();
      const sceneId = window.viewer.getCurrentSceneId();
      const snippet = 'initialYaw: ' + angles.yaw + ', initialPitch: ' + angles.pitch + ',';
      try { await navigator.clipboard.writeText(snippet); } catch {}
      console.group('Initial view for scene: ' + sceneId);
      console.log(snippet);
      console.groupEnd();
      const btn = panel.querySelector('#ha-capture-view');
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1200);
    };
    return panel;
  }

  function showForm(on) {
    panel.querySelector('.ha-form').hidden = !on;
    panel.querySelector('.ha-hint').hidden = on;
    if (on) {
      document.getElementById('ha-title').value = '';
      document.getElementById('ha-rows').value = '';
      document.getElementById('ha-title').focus();
    }
  }

  function refreshList() {
    const list = document.getElementById('ha-list');
    list.innerHTML = '';
    const hotspots = window.viewer.exportHotspots();
    if (hotspots.length === 0) {
      const li = document.createElement('li');
      li.className = 'ha-empty';
      li.textContent = 'No hotspots yet.';
      list.appendChild(li);
      return;
    }
    hotspots.forEach((h, i) => {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.textContent = h.title;
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'ha-del';
      del.setAttribute('aria-label', 'Delete');
      del.innerHTML = '&times;';
      del.onclick = () => { window.viewer.removeHotspotAt(i); refreshList(); };
      li.append(span, del);
      list.appendChild(li);
    });
  }

  function enable() {
    if (!window.viewer) { console.warn('Viewer not ready'); return; }
    buildPanel();
    panel.classList.add('is-open');
    window.viewer.setEditMode(true);
    window.viewer.onEditPlace = (pos) => { pending = pos; showForm(true); };
    refreshList();
    console.info('Hotspot author mode ON. Click in the panorama to place a hotspot. Alt+H to exit.');
  }

  function disable() {
    if (panel) panel.classList.remove('is-open');
    if (window.viewer) {
      window.viewer.setEditMode(false);
      window.viewer.onEditPlace = null;
    }
    pending = null;
  }

  window.enablePanoAuthorMode = enable;
  window.disablePanoAuthorMode = disable;

  document.addEventListener('keydown', e => {
    if (e.altKey && (e.key === 'h' || e.key === 'H')) {
      e.preventDefault();
      if (panel && panel.classList.contains('is-open')) disable(); else enable();
    }
  });
})();
