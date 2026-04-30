import * as THREE from 'three';
import { createHotspot, tickHotspot, toggleHotspot, closeHotspot } from './hotspots.js';
import { SCENES } from './data.js';

export class PanoViewer {
  constructor(canvasEl) {
    this.canvas     = canvasEl;
    this.hotspots   = [];
    this._editMode  = false;
    this._dragging  = false;
    this._mouseMoved = false;
    this._prevX = 0;
    this._prevY = 0;
    this._theta = 0;              // horizontal look angle
    this._phi   = Math.PI / 2;   // vertical look angle (horizon = PI/2)

    this._initRenderer();
    this._initScene();
    this._initControls();
    this._animate();

    // Load the first scene by default.
    if (SCENES.length > 0) this.loadScene(SCENES[0].id);
  }

  // ── Renderer + Camera ──────────────────────────────────────────────────────

  _initRenderer() {
    const container = this.canvas.parentElement;
    const w = container.clientWidth;
    const h = container.clientHeight;

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);

    this.scene  = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 200);
    this.camera.position.set(0, 0, 0);

    window.addEventListener('resize', () => this._onResize());
  }

  // ── Panorama sphere ────────────────────────────────────────────────────────

  _initScene() {
    const geo = new THREE.SphereGeometry(80, 64, 32);
    const mat = new THREE.MeshBasicMaterial({ side: THREE.BackSide });
    this.sphere = new THREE.Mesh(geo, mat);
    // Flip horizontally so the equirectangular texture reads correctly
    // when viewed from inside the sphere.
    this.sphere.scale.x = -1;
    this.scene.add(this.sphere);

    // Show procedural placeholder immediately; real panorama will replace it via loadScene().
    this.sphere.material.map = this._proceduralPano();
    this.sphere.material.needsUpdate = true;
  }

  _loadPanorama(src) {
    new THREE.TextureLoader().load(
      src,
      (tex) => {
        this.sphere.material.map = tex;
        this.sphere.material.needsUpdate = true;
        if (this.onPanoramaLoaded) this.onPanoramaLoaded();
      },
      undefined,
      () => {
        // File missing — fall back to procedural placeholder
        this.sphere.material.map = this._proceduralPano();
        this.sphere.material.needsUpdate = true;
      },
    );
  }

  // Load an equirectangular panorama from an external URL (e.g. for testing)
  loadFromURL(url) {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(url, (tex) => {
      this.sphere.material.map = tex;
      this.sphere.material.needsUpdate = true;
    });
  }

  _proceduralPano() {
    const c = document.createElement('canvas');
    c.width = 2048; c.height = 1024;
    const ctx = c.getContext('2d');

    const g1 = ctx.createLinearGradient(0, 0, 0, c.height * 0.5);
    g1.addColorStop(0, '#0c1220'); g1.addColorStop(1, '#182340');
    ctx.fillStyle = g1; ctx.fillRect(0, 0, c.width, c.height * 0.5);

    const g2 = ctx.createLinearGradient(0, c.height * 0.5, 0, c.height);
    g2.addColorStop(0, '#252a38'); g2.addColorStop(1, '#0f111a');
    ctx.fillStyle = g2; ctx.fillRect(0, c.height * 0.5, c.width, c.height * 0.5);

    const g3 = ctx.createLinearGradient(0, c.height * 0.43, 0, c.height * 0.57);
    g3.addColorStop(0, '#182340'); g3.addColorStop(0.5, '#2e3550'); g3.addColorStop(1, '#252a38');
    ctx.fillStyle = g3; ctx.fillRect(0, c.height * 0.43, c.width, c.height * 0.14);

    ctx.strokeStyle = 'rgba(100,140,220,0.05)'; ctx.lineWidth = 1.5;
    for (let x = 0; x < c.width; x += 96) {
      ctx.beginPath(); ctx.moveTo(x, c.height * 0.28); ctx.lineTo(x, c.height * 0.72); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(120,160,255,0.055)'; ctx.lineWidth = 1;
    for (let x = 0; x < c.width; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, c.height * 0.57); ctx.lineTo(x, c.height); ctx.stroke();
    }
    for (let y = c.height * 0.57; y < c.height; y += 52) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke();
    }
    // Ambient light blobs
    [[320, 260], [960, 240], [1680, 250], [480, 790], [1280, 800]].forEach(([x, y]) => {
      const rg = ctx.createRadialGradient(x, y, 0, x, y, 130);
      rg.addColorStop(0, 'rgba(60, 110, 210, 0.1)'); rg.addColorStop(1, 'transparent');
      ctx.fillStyle = rg; ctx.fillRect(x - 140, y - 140, 280, 280);
    });

    return new THREE.CanvasTexture(c);
  }

  // ── Controls ───────────────────────────────────────────────────────────────

  _initControls() {
    const el = this.canvas;

    el.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      this._dragging   = true;
      this._mouseMoved = false;
      this._prevX      = e.clientX;
      this._prevY      = e.clientY;
      el.classList.add('dragging');
    });
    window.addEventListener('mouseup', () => {
      this._dragging = false;
      el.classList.remove('dragging');
    });
    window.addEventListener('mousemove', e => {
      if (!this._dragging) return;
      this._mouseMoved = true;
      this._rotateCam(e.clientX - this._prevX, e.clientY - this._prevY);
      this._prevX = e.clientX;
      this._prevY = e.clientY;
    });

    el.addEventListener('touchstart', e => {
      if (e.touches.length !== 1) return;
      this._dragging   = true;
      this._mouseMoved = false;
      this._prevX      = e.touches[0].clientX;
      this._prevY      = e.touches[0].clientY;
    }, { passive: true });
    window.addEventListener('touchend', () => { this._dragging = false; });
    window.addEventListener('touchmove', e => {
      if (!this._dragging || e.touches.length !== 1) return;
      e.preventDefault(); // block page scroll while dragging the panorama
      this._mouseMoved = true;
      this._rotateCam(e.touches[0].clientX - this._prevX, e.touches[0].clientY - this._prevY);
      this._prevX = e.touches[0].clientX;
      this._prevY = e.touches[0].clientY;
    }, { passive: false });

    el.addEventListener('click', e => this._onClick(e));

    this._applyCamera();
  }

  _rotateCam(dx, dy) {
    // Sphere is mirrored on X (see _initScene), so invert horizontal drag direction
    // to keep the gesture feeling natural (drag right → view pans right).
    this._theta += dx * 0.004;
    this._phi    = Math.max(0.15, Math.min(Math.PI - 0.15, this._phi - dy * 0.004));
    this._applyCamera();
  }

  _applyCamera() {
    const { _theta: t, _phi: p } = this;
    this.camera.lookAt(Math.sin(p) * Math.cos(t), Math.cos(p), Math.sin(p) * Math.sin(t));
  }

  // ── Click / raycasting ─────────────────────────────────────────────────────

  _onClick(e) {
    if (this._mouseMoved) return;

    const rect   = this.canvas.getBoundingClientRect();
    const mouse  = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width)  *  2 - 1,
      ((e.clientY - rect.top)  / rect.height) * -2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, this.camera);

    if (this._editMode) {
      const hits = ray.intersectObject(this.sphere);
      if (hits.length > 0) {
        const norm  = hits[0].point.clone().normalize();
        const phi   = Math.acos(norm.y);
        const theta = Math.atan2(norm.z, norm.x);
        if (this.onEditPlace) {
          this.onEditPlace({ theta: +theta.toFixed(4), phi: +phi.toFixed(4) });
        }
      }
      return;
    }

    // Check whether user clicked an existing hotspot marker
    const targets = [];
    this.hotspots.forEach(h =>
      h.children.forEach(c => { if (c !== h.userData.label && c !== h.userData.stem) targets.push(c); })
    );
    const hits = ray.intersectObjects(targets);
    if (hits.length > 0) {
      const clicked = hits[0].object.parent;
      this.hotspots.forEach(h => { if (h !== clicked) closeHotspot(h); });
      toggleHotspot(clicked);
    }
  }

  // ── Scene switching ────────────────────────────────────────────────────────

  loadScene(sceneId) {
    const scene = SCENES.find(s => s.id === sceneId);
    if (!scene) return;

    this._currentSceneId = sceneId;

    // Swap the panorama texture.
    this._loadPanorama(scene.file);

    // Remove existing hotspots from the 3D scene.
    this.hotspots.forEach(h => this.scene.remove(h));
    this.hotspots = [];

    // Add hotspots belonging to this scene (if any).
    (scene.hotspots || []).forEach(data => {
      this.hotspots.push(createHotspot(this.scene, data));
    });

    // Apply per-scene initial orientation (or neutral forward view if absent).
    this._theta = (typeof scene.initialYaw   === 'number') ? scene.initialYaw   : 0;
    this._phi   = (typeof scene.initialPitch === 'number') ? scene.initialPitch : Math.PI / 2;
    this._applyCamera();

    if (this.onSceneChanged) this.onSceneChanged(sceneId);
  }

  getCurrentSceneId() { return this._currentSceneId; }

  // Current camera angles — used by the author panel to capture initial yaw/pitch
  getCameraAngles() {
    return { yaw: +this._theta.toFixed(4), pitch: +this._phi.toFixed(4) };
  }

  // Add a hotspot programmatically (used by the author panel in main.js).
  addHotspot({ theta, phi, title, rows }) {
    const h = createHotspot(this.scene, { theta, phi, title, rows });
    h.userData.authored = true;
    this.hotspots.push(h);
    return h;
  }

  removeHotspotAt(idx) {
    const h = this.hotspots[idx];
    if (!h) return;
    this.scene.remove(h);
    this.hotspots.splice(idx, 1);
  }

  // Return a JSON-serialisable snapshot of the current pano's hotspots.
  exportHotspots() {
    return this.hotspots.map(h => {
      const n = h.position.clone().normalize();
      return {
        theta: +Math.atan2(n.z, n.x).toFixed(4),
        phi:   +Math.acos(n.y).toFixed(4),
        title: h.userData.title,
        rows:  [...h.userData.rows],
      };
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  setEditMode(val) {
    this._editMode = val;
    document.getElementById('viewer-container').classList.toggle('edit-mode', val);
    document.getElementById('hint-bar').textContent = val
      ? 'Click anywhere in the scene to place a hotspot — coordinates logged to console'
      : 'Drag to look around \u00b7 Click a marker to expand';
  }

  // ── Resize ─────────────────────────────────────────────────────────────────

  _onResize() {
    const w = this.canvas.parentElement.clientWidth;
    const h = this.canvas.parentElement.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // ── Animation loop ─────────────────────────────────────────────────────────

  _animate() {
    const clock = new THREE.Clock();
    const tick = () => {
      requestAnimationFrame(tick);
      const t = clock.getElapsedTime();
      this.hotspots.forEach(h => tickHotspot(h, t));
      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }
}
