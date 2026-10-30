// script.js
import * as THREE from 'three';

/* ============================================================
   UTILITIES
   ============================================================ */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* Radial glow sprite used by both scenes */
function makeGlowTexture() {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0.00, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,240,205,0.92)');
  g.addColorStop(0.45, 'rgba(230,201,135,0.34)');
  g.addColorStop(1.00, 'rgba(230,201,135,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}
const GLOW_TEX = makeGlowTexture();

/* ============================================================
   1. BACKGROUND — SMOOTH PARTICLE FIELD
   ============================================================ */
const bgCanvas = document.getElementById('bg');
const bgRenderer = new THREE.WebGLRenderer({
  canvas: bgCanvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance'
});
bgRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
bgRenderer.setSize(window.innerWidth, window.innerHeight);

const bgScene = new THREE.Scene();
const bgCamera = new THREE.PerspectiveCamera(
  62,
  window.innerWidth / window.innerHeight,
  0.1,
  600
);
bgCamera.position.set(0, 0, 72);

/* --- Particles --- */
const COUNT = 1300;
const RANGE = 145;

const positions = new Float32Array(COUNT * 3);
const seeds = new Float32Array(COUNT);

for (let i = 0; i < COUNT; i++) {
  positions[i * 3 + 0] = (Math.random() - 0.5) * RANGE * 2;
  positions[i * 3 + 1] = (Math.random() - 0.5) * RANGE * 1.7;
  positions[i * 3 + 2] = (Math.random() - 0.5) * RANGE * 1.3;
  seeds[i] = Math.random() * Math.PI * 2;
}
const basePositions = positions.slice();

const particleGeo = new THREE.BufferGeometry();
particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const particleMat = new THREE.PointsMaterial({
  size: 2.1,
  map: GLOW_TEX,
  transparent: true,
  opacity: 0.95,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  color: 0xe6c987,
  sizeAttenuation: true
});

const particles = new THREE.Points(particleGeo, particleMat);
bgScene.add(particles);

/* --- Distant wireframe geometry for depth --- */
const icoWire = new THREE.Mesh(
  new THREE.IcosahedronGeometry(30, 1),
  new THREE.MeshBasicMaterial({
    color: 0xe6c987,
    wireframe: true,
    transparent: true,
    opacity: 0.085
  })
);
icoWire.position.set(-38, 18, -60);
bgScene.add(icoWire);

const torusWire = new THREE.Mesh(
  new THREE.TorusGeometry(22, 0.55, 8, 90),
  new THREE.MeshBasicMaterial({
    color: 0x9db9ff,
    transparent: true,
    opacity: 0.10
  })
);
torusWire.position.set(48, -22, -75);
bgScene.add(torusWire);

/* --- Pointer parallax --- */
const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener('pointermove', (e) => {
  pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
}, { passive: true });

/* --- Resize --- */
window.addEventListener('resize', () => {
  bgRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  bgRenderer.setSize(window.innerWidth, window.innerHeight);
  bgCamera.aspect = window.innerWidth / window.innerHeight;
  bgCamera.updateProjectionMatrix();
});

/* --- Animate background --- */
const bgClock = new THREE.Clock();
const posAttr = particleGeo.attributes.position;

function animateBackground() {
  requestAnimationFrame(animateBackground);

  const t = bgClock.getElapsedTime();
  const arr = posAttr.array;

  /* Smooth, bounded organic drift (no accumulation error) */
  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    const s = seeds[i];
    arr[i3 + 0] = basePositions[i3 + 0] + Math.cos(t * 0.30 + s * 1.7) * 2.4;
    arr[i3 + 1] = basePositions[i3 + 1] + Math.sin(t * 0.46 + s) * 2.8;
    arr[i3 + 2] = basePositions[i3 + 2] + Math.sin(t * 0.22 + s * 0.6) * 1.6;
  }
  posAttr.needsUpdate = true;

  particles.rotation.y = t * 0.026;
  particles.rotation.x = Math.sin(t * 0.11) * 0.07;

  icoWire.rotation.y = t * 0.055;
  icoWire.rotation.x = t * 0.028;

  torusWire.rotation.z = t * 0.09;
  torusWire.rotation.y = t * 0.05;

  /* Eased parallax */
  pointer.x += (pointer.tx - pointer.x) * 0.045;
  pointer.y += (pointer.ty - pointer.y) * 0.045;

  bgCamera.position.x += (pointer.x * 11 - bgCamera.position.x) * 0.05;
  bgCamera.position.y += (-pointer.y * 8 - bgCamera.position.y) * 0.05;
  bgCamera.lookAt(0, 0, 0);

  bgRenderer.render(bgScene, bgCamera);
}
animateBackground();

/* ============================================================
   2. THE GAME — 2D ORTHOGRAPHIC THREE.JS SCENE
   ============================================================ */
const stage = document.getElementById('game-stage');
const gameCanvas = document.getElementById('game-canvas');

const gameRenderer = new THREE.WebGLRenderer({
  canvas: gameCanvas,
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance'
});
gameRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const gameScene = new THREE.Scene();
const gameCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
gameCamera.position.set(0, 0, 10);

let worldW = 1000;
let worldH = 600;

/* ---------- Player ---------- */
const player = new THREE.Group();
player.position.set(0, -220, 0);
gameScene.add(player);

const playerHalo = new THREE.Mesh(
  new THREE.CircleGeometry(30, 40),
  new THREE.MeshBasicMaterial({
    color: 0xe6c987,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
);
playerHalo.position.z = -0.2;
player.add(playerHalo);

const playerRing = new THREE.Mesh(
  new THREE.RingGeometry(15, 17.5, 48),
  new THREE.MeshBasicMaterial({
    color: 0xe6c987,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthWrite: false
  })
);
playerRing.position.z = 0.05;
player.add(playerRing);

const playerCore = new THREE.Mesh(
  new THREE.CircleGeometry(9, 36),
  new THREE.MeshBasicMaterial({ color: 0xfff4d8 })
);
playerCore.position.z = 0.1;
player.add(playerCore);

/* ---------- Entity factories ---------- */
function createOrb() {
  const g = new THREE.Group();
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(27, 36),
    new THREE.MeshBasicMaterial({
      color: 0xe6c987,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  halo.position.z = -0.2;
  g.add(halo);

  const core = new THREE.Mesh(
    new THREE.CircleGeometry(11, 36),
    new THREE.MeshBasicMaterial({ color: 0xffe3a8 })
  );
  core.position.z = 0.1;
  g.add(core);

  g.userData.halo = halo;
  return g;
}

function createHazard() {
  const g = new THREE.Group();
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(30, 36),
    new THREE.MeshBasicMaterial({
      color: 0xff2d55,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  halo.position.z = -0.2;
  g.add(halo);

  const core = new THREE.Mesh(
    new THREE.CircleGeometry(15, 3),
    new THREE.MeshBasicMaterial({ color: 0xff5c7a })
  );
  core.position.z = 0.1;
  g.add(core);

  g.userData.halo = halo;
  return g;
}

/* ---------- Pools & entity list ---------- */
const orbPool = [];
const hazardPool = [];
const entities = [];

/* ---------- Game state ---------- */
const state = {
  phase: 'idle',      // idle | playing | over
  score: 0,
  best: 0,
  lives: 3,
  combo: 1,
  elapsed: 0,
  spawnTimer: 0.6,
  targetX: 0,
  shake: 0
};

try {
  state.best = parseInt(localStorage.getItem('aurum-best') || '0', 10) || 0;
} catch (_) { /* storage unavailable */ }

/* ---------- HUD ---------- */
const elScore = document.getElementById('hud-score');
const elBest = document.getElementById('hud-best');
const elCombo = document.getElementById('hud-combo');
const elLives = document.getElementById('hud-lives');
const elOverlay = document.getElementById('game-overlay');
const elOverlayTitle = document.getElementById('overlay-title');
const elOverlayText = document.getElementById('overlay-text');
const elStart = document.getElementById('game-start');
const elFlash = document.getElementById('flash');

function updateHUD() {
  elScore.textContent = state.score.toLocaleString();
  elBest.textContent = state.best.toLocaleString();
  elCombo.textContent = '×' + state.combo;

  const filled = Math.max(0, state.lives);
  elLives.textContent = '◆'.repeat(filled) + '◇'.repeat(Math.max(0, 3 - filled));
  elLives.style.opacity = filled > 0 ? '1' : '0.4';
}

/* ---------- Resize (orthographic world) ---------- */
function resizeGame() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  if (!w || !h) return;

  gameRenderer.setSize(w, h, false);

  const viewH = 600;
  const viewW = viewH * (w / h);

  gameCamera.left = -viewW / 2;
  gameCamera.right = viewW / 2;
  gameCamera.top = viewH / 2;
  gameCamera.bottom = -viewH / 2;
  gameCamera.updateProjectionMatrix();

  worldW = viewW;
  worldH = viewH;

  state.targetX = clamp(state.targetX, -worldW / 2 + 22, worldW / 2 - 22);
  clampPlayerX();
}
resizeGame();

if ('ResizeObserver' in window) {
  new ResizeObserver(resizeGame).observe(stage);
}
window.addEventListener('resize', resizeGame);

/* ---------- Input ---------- */
const keys = { left: false, right: false };

function clampPlayerX() {
  const limit = worldW / 2 - 22;
  state.targetX = clamp(state.targetX, -limit, limit);
}

stage.addEventListener('pointermove', (e) => {
  if (state.phase !== 'playing') return;
  const rect = stage.getBoundingClientRect();
  const rel = (e.clientX - rect.left) / rect.width; // 0..1
  state.targetX = (rel - 0.5) * worldW;
}, { passive: true });

stage.addEventListener('pointerdown', (e) => {
  if (state.phase !== 'playing') return;
  const rect = stage.getBoundingClientRect();
  const rel = (e.clientX - rect.left) / rect.width;
  state.targetX = (rel - 0.5) * worldW;
}, { passive: true });

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    keys.left = true;
    if (state.phase === 'playing') e.preventDefault();
  }
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    keys.right = true;
    if (state.phase === 'playing') e.preventDefault();
  }
  if ((e.key === ' ' || e.key === 'Enter') && state.phase !== 'playing') {
    const active = document.activeElement;
    if (active && active.tagName === 'BUTTON') return;
    e.preventDefault();
    startGame();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
});

/* ---------- Spawning ---------- */
function spawnEntity() {
  const isHazard = Math.random() < 0.34;
  const pool = isHazard ? hazardPool : orbPool;

  let mesh = pool.pop();
  if (!mesh) mesh = isHazard ? createHazard() : createOrb();

  const halfW = worldW / 2 - 34;
  mesh.position.set((Math.random() * 2 - 1) * halfW, worldH / 2 + 40, 0);
  mesh.rotation.z = Math.random() * Math.PI * 2;
  mesh.scale.setScalar(1);

  gameScene.add(mesh);

  entities.push({
    mesh,
    type: isHazard ? 'hazard' : 'orb',
    r: isHazard ? 15 : 11,
    spin: (Math.random() - 0.5) * 2.2
  });
}

function removeEntity(index) {
  const e = entities[index];
  if (!e) return;
  gameScene.remove(e.mesh);
  e.mesh.scale.setScalar(1);
  (e.type === 'orb' ? orbPool : hazardPool).push(e.mesh);
  entities.splice(index, 1);
}

function clearEntities() {
  for (let i = entities.length - 1; i >= 0; i--) removeEntity(i);
}

/* ---------- Feedback ---------- */
function flashScreen() {
  elFlash.classList.add('on');
  setTimeout(() => elFlash.classList.remove('on'), 60);
}

function collect(e) {
  state.score += 10 * state.combo;
  state.combo = Math.min(8, state.combo + 1);

  /* pop animation */
  e.mesh.scale.setScalar(1.9);
  e.mesh.userData.halo.material.opacity = 0.5;

  updateHUD();
}

function hitPlayer() {
  state.lives -= 1;
  state.combo = 1;
  state.shake = 1;
  flashScreen();
  updateHUD();

  if (state.lives <= 0) gameOver();
}

/* ---------- Game flow ---------- */
function resetGame() {
  clearEntities();
  state.score = 0;
  state.lives = 3;
  state.combo = 1;
  state.elapsed = 0;
  state.spawnTimer = 0.7;
  state.targetX = 0;
  state.shake = 0;

  player.position.x = 0;
  player.scale.setScalar(1);

  updateHUD();
}

function startGame() {
  resetGame();
  state.phase = 'playing';
  elOverlay.classList.add('hidden');
}

function gameOver() {
  state.phase = 'over';

  if (state.score > state.best) {
    state.best = state.score;
    try { localStorage.setItem('aurum-best', String(state.best)); } catch (_) {}
  }
  updateHUD();

  elOverlayTitle.textContent = 'Run complete';
  elOverlayText.innerHTML =
    `<span class="final-score">${state.score.toLocaleString()}</span><br>` +
    `Best: ${state.best.toLocaleString()} · Combo peak reached`;
  elStart.textContent = 'Play again';
  elOverlay.classList.remove('hidden');
}

elStart.addEventListener('click', startGame);

/* ---------- Update ---------- */
function updateGame(dt) {
  state.elapsed += dt;

  const speed = 250 + Math.min(state.elapsed * 14, 330);

  /* Spawn cadence */
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnEntity();
    if (state.elapsed > 14 && Math.random() < 0.32) spawnEntity();
    state.spawnTimer = Math.max(0.20, 0.62 - state.elapsed * 0.011);
  }

  /* Player movement */
  if (keys.left) state.targetX -= 660 * dt;
  if (keys.right) state.targetX += 660 * dt;
  clampPlayerX();

  const playerLimit = worldW / 2 - 22;
  state.targetX = clamp(state.targetX, -playerLimit, playerLimit);

  player.position.x += (state.targetX - player.position.x) * Math.min(1, dt * 16);
  player.position.y = -worldH / 2 + 78 + Math.sin(state.elapsed * 3) * 3;

  playerRing.rotation.z += dt * 1.4;
  playerHalo.scale.setScalar(1 + Math.sin(state.elapsed * 4.2) * 0.09);

  /* Entities */
  for (let i = entities.length - 1; i >= 0; i--) {
    const e = entities[i];

    e.mesh.position.y -= speed * dt;
    e.mesh.rotation.z += e.spin * dt * 0.7;

    /* Pop decay */
    if (e.mesh.scale.x > 1) {
      e.mesh.scale.multiplyScalar(1 - dt * 5);
      if (e.mesh.scale.x < 1) e.mesh.scale.setScalar(1);
    }

    /* Out of bounds */
    if (e.mesh.position.y < -worldH / 2 - 70) {
      removeEntity(i);
      continue;
    }

    /* Collision */
    const dx = e.mesh.position.x - player.position.x;
    const dy = e.mesh.position.y - player.position.y;
    const reach = e.r + 17;

    if (dx * dx + dy * dy < reach * reach) {
      if (e.type === 'orb') {
        collect(e);
        removeEntity(i);
      } else {
        hitPlayer();
        removeEntity(i);
        if (state.phase !== 'playing') return;
      }
    }
  }

  /* Camera shake decay */
  if (state.shake > 0.001) {
    state.shake *= 0.88;
    gameCamera.position.x = (Math.random() - 0.5) * state.shake * 16;
    gameCamera.position.y = (Math.random() - 0.5) * state.shake * 16;
  } else if (state.shake !== 0) {
    state.shake = 0;
    gameCamera.position.x = 0;
    gameCamera.position.y = 0;
  }
}

/* ---------- Idle animation ---------- */
let idleT = 0;
function updateIdle(dt) {
  idleT += dt;
  playerRing.rotation.z += dt * 0.7;
  playerHalo.scale.setScalar(1 + Math.sin(idleT * 2.4) * 0.07);
  player.position.y = -worldH / 2 + 78 + Math.sin(idleT * 2) * 4;
  player.position.x += (0 - player.position.x) * Math.min(1, dt * 4);
}

/* ---------- Main loop ---------- */
let lastFrame = performance.now();

function gameLoop(now) {
  requestAnimationFrame(gameLoop);

  const dt = Math.min((now - lastFrame) / 1000, 0.05);
  lastFrame = now;

  if (state.phase === 'playing') {
    updateGame(dt);
  } else {
    updateIdle(dt);
  }

  gameRenderer.render(gameScene, gameCamera);
}

updateHUD();
resizeGame();
requestAnimationFrame(gameLoop);

/* ============================================================
   3. UI BEHAVIOUR
   ============================================================ */

/* --- Dropdown --- */
const dropdown = document.getElementById('dropdown');
const dropBtn = dropdown.querySelector('.drop-btn');

dropBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const open = dropdown.classList.toggle('open');
  dropBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
});

document.addEventListener('click', () => {
  dropdown.classList.remove('open');
  dropBtn.setAttribute('aria-expanded', 'false');
});

dropdown.querySelectorAll('.drop-menu a').forEach((a) => {
  a.addEventListener('click', () => {
    dropdown.classList.remove('open');
    dropBtn.setAttribute('aria-expanded', 'false');
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    dropdown.classList.remove('open');
    dropBtn.setAttribute('aria-expanded', 'false');
  }
});

/* --- Cursor spotlight on glow cards --- */
document.querySelectorAll('.glow-card').forEach((card) => {
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });
});

/* --- Scroll reveal --- */
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  revealEls.forEach((el, i) => {
    el.style.transitionDelay = (Math.min(i, 8) * 55) + 'ms';
    io.observe(el);
  });
} else {
  revealEls.forEach((el) => el.classList.add('in'));
}

/* --- Year --- */
document.getElementById('year').textContent = new Date().getFullYear();
