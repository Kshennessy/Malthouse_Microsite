// Scene configuration for the 1886 Malthouse 360° tour.
//
// Each scene has:
//   id       — internal ID used by the viewer
//   name     — short display label (shown in the badge over the viewer)
//   file     — relative path to the equirectangular JPG
//   source   — (optional) original filename for reference
//   mapPos   — { x, y } percentage (0–100) marking this viewpoint on the explorer map
//   caption  — (optional) sentence describing what's visible from this viewpoint.
//              Shown below the panorama. Leave as '' to hide the caption for this scene.
//   hotspots — (optional) array of hotspot markers positioned on this pano
//
// To find accurate mapPos values: open the site, scroll to the Explorer section,
// and run `window.enableMapPlaceMode()` in the console. Click a point on the
// isometric map and the { x, y } coordinates will log. Paste them back into this file.
//
// Hotspot format:
//   { theta, phi, title, rows }
//   theta/phi — sphere coordinates in radians (use Place mode in the viewer to discover)
//   rows      — array of lines. Prefix '~' for muted value lines; '__' is a divider.

export const SCENES = [
  { id: 's1',  name: 'Grain intake',     file: 'panoramas/dji_0168.jpg', source: 'DJI_0168', mapPos: { x: 12.6, y: 57.0 }, initialYaw: 2.496,   initialPitch: 1.9708, caption: 'Four exterior grain receiving silos and the elevator leg that lifts barley up to the production floor. Loading dock 3 to the left.', hotspots: [] },
  { id: 's2',  name: 'Process floor',    file: 'panoramas/dji_0162.jpg', source: 'DJI_0162', mapPos: { x: 35.6, y: 49.6 }, initialYaw: -3.008,  initialPitch: 1.5828, caption: 'A clipper screener — cleans and grades incoming barley before it enters the steeping tanks.', hotspots: [] },
  { id: 's3',  name: 'Packaging hall',   file: 'panoramas/dji_0135.jpg', source: 'DJI_0135', mapPos: { x: 42.4, y: 55.5 }, initialYaw: -4.792,  initialPitch: 1.6188, caption: 'The Premier Tech automated bagging system, with a robot-arm palletizer caged off to the right. Loading dock doors lead out to shipping.', hotspots: [] },
  { id: 's4',  name: 'Steeping floor',   file: 'panoramas/dji_0163.jpg', source: 'DJI_0163', mapPos: { x: 46.9, y: 37.6 }, initialYaw: 2.546,   initialPitch: 1.4908, caption: 'Two stainless steel steeping tanks where barley starts absorbing water, fed by the insulated tempered water tank behind.', hotspots: [] },
  { id: 's5',  name: 'Conference room',  file: 'panoramas/dji_0171.jpg', source: 'DJI_0171', mapPos: { x: 48.8, y: 55.5 }, initialYaw: 2.648,   initialPitch: 1.8508, caption: 'Conference room overlooking the production floor through a full glass wall.', hotspots: [] },
  { id: 's6',  name: 'Chemistry lab',    file: 'panoramas/dji_0170.jpg', source: 'DJI_0170', mapPos: { x: 50.9, y: 61.3 }, initialYaw: 2.988,   initialPitch: 1.8108, caption: 'The on-site chemistry lab — fully equipped clean and dirty lab spaces for in-house QA.', hotspots: [] },
  { id: 's7',  name: 'Production line', file: 'panoramas/dji_0169.jpg', source: 'DJI_0169', mapPos: { x: 54.8, y: 29.1 }, initialYaw: -2.544,  initialPitch: 1.7988, caption: 'A 10-ton Kaspar Schulz rotating drum kiln, with the branded 1886 Malt House product storage silo to the right.', hotspots: [] },
  { id: 's8',  name: 'MCC room',         file: 'panoramas/dji_0157.jpg', source: 'DJI_0157', mapPos: { x: 69.8, y: 58.4 }, initialYaw: -2.8352, initialPitch: 1.7148, caption: 'The dedicated MCC room — switchgear and motor controls powering the entire facility.', hotspots: [] },
];

// Legacy export — hotspots are now defined per-scene inside SCENES.
// Retained as an empty array so older imports don't break.
export const HOTSPOTS = [];
