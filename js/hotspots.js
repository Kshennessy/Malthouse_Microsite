import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// Label canvas renderer
//
// NOTE: Text wrapping currently uses canvas measureText directly.
// For production accuracy (especially multilingual text, emoji, mixed bidi),
// replace wrapText() with @chenglou/pretext — swap in prepare() + layoutWithLines()
// once a build step (e.g. Vite) is in place.
// ─────────────────────────────────────────────────────────────────────────────

const LBL_W       = 300;
const LBL_PAD     = 20;
const LINE_H      = 22;
const TITLE_H     = 30;
const RETINA      = 2;

function wrapText(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxW - LBL_PAD * 2 && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function makeLabelTexture(title, rows) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const TITLE_FONT = 'bold 22px system-ui, -apple-system, sans-serif';
  const ROW_FONT   = '15px system-ui, -apple-system, sans-serif';
  const MAX_W      = 360;
  const PAD_X      = 16;
  const PAD_Y      = 12;
  const TITLE_LH   = 28;
  const ROW_LH     = 20;
  const ROW_GAP    = 4;
  const BORDER_W   = 2;
  const RADIUS     = 6;

  ctx.font = TITLE_FONT;
  const titleLines = wrapText(ctx, title, MAX_W);

  ctx.font = ROW_FONT;
  const rowItems = [];
  for (const row of rows) {
    if (row === '__') { rowItems.push({ type: 'divider' }); continue; }
    const muted = row.startsWith('~');
    const text  = muted ? row.slice(1) : row;
    wrapText(ctx, text, MAX_W).forEach(l => rowItems.push({ type: 'text', text: l, muted }));
  }

  let totalH = PAD_Y + titleLines.length * TITLE_LH;
  if (rowItems.length) totalH += ROW_GAP + rowItems.length * ROW_LH;
  totalH += PAD_Y;
  const totalW = MAX_W + PAD_X * 2;

  canvas.width  = totalW * RETINA;
  canvas.height = totalH * RETINA;
  ctx.scale(RETINA, RETINA);

  // Semi-transparent dark background
  ctx.fillStyle = 'rgba(10, 10, 8, 0.72)';
  roundRect(ctx, BORDER_W/2, BORDER_W/2, totalW - BORDER_W, totalH - BORDER_W, RADIUS);
  ctx.fill();

  // Red border
  ctx.strokeStyle = '#e53935';
  ctx.lineWidth = BORDER_W;
  roundRect(ctx, BORDER_W/2, BORDER_W/2, totalW - BORDER_W, totalH - BORDER_W, RADIUS);
  ctx.stroke();

  ctx.textBaseline = 'top';

  ctx.font = TITLE_FONT;
  let cy = PAD_Y;
  for (const line of titleLines) {
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line, PAD_X, cy);
    cy += TITLE_LH;
  }

  if (rowItems.length) cy += ROW_GAP;
  ctx.font = ROW_FONT;
  for (const item of rowItems) {
    if (item.type === 'divider') {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD_X, cy + ROW_LH / 2);
      ctx.lineTo(PAD_X + 40, cy + ROW_LH / 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = item.muted ? '#c4a55a' : '#ffffff';
      ctx.fillText(item.text, PAD_X, cy);
    }
    cy += ROW_LH;
  }

  return { texture: new THREE.CanvasTexture(canvas), width: totalW, height: totalH };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

const SPHERE_R = 79;

export function createHotspot(scene, { theta, phi, title, rows }) {
  // Target position on the sphere (where the pin goes)
  const targetPos = new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta) * SPHERE_R,
    Math.cos(phi) * SPHERE_R,
    Math.sin(phi) * Math.sin(theta) * SPHERE_R,
  );

  // Parent group positioned AT the target — pin/pulse/ring live here at origin
  const group = new THREE.Group();
  group.position.copy(targetPos);

  // Label offsets: up and to the right, in 'billboard space'
  // (after group.lookAt(0,0,0), local +X points 'right' on screen, +Y points 'up')
  const LABEL_OFFSET_X = 2.6;
  const LABEL_OFFSET_Y = 2.6;

  // Red pin (solid dot with white halo ring)
  const haloGeo = new THREE.RingGeometry(0.42, 0.55, 40);
  const halo = new THREE.Mesh(
    haloGeo,
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.95, depthTest: false }),
  );
  halo.renderOrder = 2;
  group.add(halo);

  const dot = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 32),
    new THREE.MeshBasicMaterial({ color: 0xe53935, side: THREE.DoubleSide, depthTest: false }),
  );
  dot.renderOrder = 3;
  group.add(dot);

  // Pulse ring behind pin
  const pulse = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.85, 40),
    new THREE.MeshBasicMaterial({ color: 0xe53935, side: THREE.DoubleSide, transparent: true, opacity: 0.4, depthTest: false }),
  );
  pulse.renderOrder = 1;
  group.add(pulse);

  // Build label texture
  const { texture, width, height } = makeLabelTexture(title, rows);
  const labelH = 3.2;
  const labelW = labelH * (width / height);
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(labelW, labelH),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthTest: false }),
  );
  // Position label offset up-and-right from pin; its centre sits at offset + labelH/2 etc
  label.position.set(LABEL_OFFSET_X + labelW / 2, LABEL_OFFSET_Y + labelH / 2, 0);
  label.renderOrder = 4;
  label.visible = true;
  group.add(label);

  // Leader line from pin (0,0) to bottom-left corner of label
  const leaderStart = new THREE.Vector3(0.3, 0.3, 0);           // just outside pin
  const leaderEnd   = new THREE.Vector3(LABEL_OFFSET_X, LABEL_OFFSET_Y, 0);  // bottom-left corner of label
  const leader = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([leaderStart, leaderEnd]),
    new THREE.LineBasicMaterial({ color: 0xe53935, transparent: true, opacity: 0.85, depthTest: false }),
  );
  leader.renderOrder = 2;
  group.add(leader);

  group.userData = { title, rows, open: true, label, stem: leader, ring: halo, pulse, dot };
  scene.add(group);
  return group;
}

export function tickHotspot(hotspot, t) {
  // Billboard: face toward sphere center (where camera lives)
  hotspot.lookAt(0, 0, 0);
  // Pulse animation on the ring behind the pin
  const s = 1 + Math.sin(t * 2.2) * 0.15;
  hotspot.userData.pulse.scale.setScalar(s);
  hotspot.userData.pulse.material.opacity = 0.22 + Math.sin(t * 2.2) * 0.18;
}

export function toggleHotspot(hotspot) {
  const ud = hotspot.userData;
  ud.open = !ud.open;
  ud.label.visible = ud.open;
  ud.stem.visible  = ud.open;
}

export function closeHotspot(hotspot) {
  hotspot.userData.open = true;
  hotspot.userData.label.visible = true;
  hotspot.userData.stem.visible  = true;
}
