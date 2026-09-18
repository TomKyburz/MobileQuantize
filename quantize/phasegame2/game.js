import * as THREE from 'three';
import * as CANNON from 'cannon';

import { World2 } from './js/world2.js';
import { loader, adam, floorTexture, waterTexture, void1Texture, roofTexture, faceTex, sideTex, skyTexture } from './js/assetloader.js';
import { jumpVelocity, maxSpeed, acceleration } from './js/variables.js';
import { Player } from './js/player.js';
import { Vehicle } from './js/car.js';

const clock = new THREE.Clock();

let ws;
let playerId;
const otherPlayers = {};
function connectWS() {
  ws = new WebSocket(`ws://${location.host}/ws`);
  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'init') playerId = msg.id;

    if (msg.type === 'players') {
      msg.players.forEach(p => {
        if (!otherPlayers[p.id]) {
          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 1.5, 0.5),
            new THREE.MeshPhongMaterial({ color: 0x0000ff })
          );
          myWorld.scene.add(mesh);
          otherPlayers[p.id] = mesh;
        }
        otherPlayers[p.id].position.set(p.x, p.y, p.z);
        otherPlayers[p.id].rotation.y = p.rotationY;
      });
    }

    if (msg.type === 'disconnect') {
      if (otherPlayers[msg.id]) {
        myWorld.scene.remove(otherPlayers[msg.id]);
        delete otherPlayers[msg.id];
      }
    }
  };
  ws.onclose = () => { setTimeout(connectWS, 1000); };
}
connectWS();

const screen = document.getElementById("game-container");
const full = document.getElementById("lines");
const grid = document.getElementById("grid");
const menu = document.getElementById("pmenu");
const resume = document.getElementById("resume");
const fscreen = document.getElementById("options");
const characteroptions = document.getElementById("character");
menu.addEventListener('click', e => e.stopPropagation());

let screenW = screen.clientWidth;
let screenH = screen.clientHeight;

// --- CREATE WORLD ---
const myWorld = new World2();

// --- PLAYER & VEHICLE ---
const player = new Player(myWorld.world, myWorld.scene);
const car = new Vehicle(myWorld.world, myWorld.scene);

// --- CAMERA & RENDERER ---
const camera = new THREE.PerspectiveCamera(70, screenW / screenH, 0.1, 1000);
myWorld.scene.add(camera);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(screenW, screenH, false);
renderer.autoClear = false;
screen.appendChild(renderer.domElement);

// --- HUD SCENE ---
const hudScene = new THREE.Scene();
const hudCamera = new THREE.OrthographicCamera(
  -screenW / 2, screenW / 2,
   screenH / 2, -screenH / 2,
  0, 10
);

// --- HOTBAR ---
const SLOT_SIZE = 50;
const SLOT_GAP = 4;
const SLOT_COUNT = 9;
let selectedSlot = 0;
const slotMeshes = [];
const totalWidth = SLOT_COUNT * SLOT_SIZE + (SLOT_COUNT - 1) * SLOT_GAP;

for (let i = 0; i < SLOT_COUNT; i++) {
  const x = -totalWidth / 2 + i * (SLOT_SIZE + SLOT_GAP) + SLOT_SIZE / 2;
  const y = -screenH / 2 + SLOT_SIZE / 2 + 20;

  const slot = new THREE.Mesh(
    new THREE.PlaneGeometry(SLOT_SIZE, SLOT_SIZE),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 })
  );
  slot.position.set(x, y, 0);
  hudScene.add(slot);

  const border = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-SLOT_SIZE / 2, -SLOT_SIZE / 2, 0.1),
      new THREE.Vector3( SLOT_SIZE / 2, -SLOT_SIZE / 2, 0.1),
      new THREE.Vector3( SLOT_SIZE / 2,  SLOT_SIZE / 2, 0.1),
      new THREE.Vector3(-SLOT_SIZE / 2,  SLOT_SIZE / 2, 0.1),
    ]),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })
  );
  slot.add(border);
  slotMeshes.push({ slot, border });
}

function setSelectedSlot(index) {
  selectedSlot = index;
  slotMeshes.forEach(({ slot, border }, i) => {
    slot.material.opacity = i === index ? 0.7 : 0.4;
    border.material.opacity = i === index ? 1.0 : 0.3;
    border.material.color.set(i === index ? 0xffff00 : 0xffffff);
  });
}
setSelectedSlot(0);

// --- POINTER LOCK ---
let isLocked = false;
const isMobile = () => 'ontouchstart' in window;

function showPauseMenu() {
  menu.style.display = 'flex';
}

function hidePauseMenu() {
  menu.style.display = 'none';
}

screen.addEventListener('click', () => {
  if (!isMobile() && !isLocked) screen.requestPointerLock();
});

resume.addEventListener('click', () => {
  screen.requestPointerLock();
  hidePauseMenu();
});

fscreen.addEventListener('click', () => {
  screen.requestPointerLock();
  screen.requestFullscreen();
});

full.addEventListener('click', () => {
  document.exitPointerLock();
  showPauseMenu();
});

grid.addEventListener('click', () => {
  cameraMode = cameraMode === "first" ? "third" : "first";
});

document.addEventListener('pointerlockchange', () => {
  isLocked = document.pointerLockElement === screen;
});

document.addEventListener('keydown', e => {
  if (e.code === 'Escape') document.exitPointerLock();
});

// --- YAW / PITCH ---
let yaw   = -Math.PI / 2;
let pitch = 0;

document.addEventListener('mousemove', e => {
  if (!isLocked) return;
  yaw   -= e.movementX * 0.002;
  pitch -= e.movementY * 0.002;
  pitch  = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch));
});

// --- KEYBOARD ---
const keys = {};
document.addEventListener('keydown', e => {
  keys[e.code] = true;
  const num = parseInt(e.key);
  if (num >= 1 && num <= 9) setSelectedSlot(num - 1);
});
document.addEventListener('keyup', e => keys[e.code] = false);

// --- SCROLL HOTBAR ---
screen.addEventListener('wheel', e => {
  const next = (selectedSlot + (e.deltaY > 0 ? 1 : -1) + SLOT_COUNT) % SLOT_COUNT;
  setSelectedSlot(next);
});

// --- STATE ---
let cameraMode = "first";
const lastKeys = {};
const thirdPersonRay = new THREE.Raycaster();

// --- RESIZE ---
window.addEventListener('resize', () => {
  screenW = screen.clientWidth;
  screenH = screen.clientHeight;
  camera.aspect = screenW / screenH;
  camera.updateProjectionMatrix();
  hudCamera.left   = -screenW / 2;
  hudCamera.right  =  screenW / 2;
  hudCamera.top    =  screenH / 2;
  hudCamera.bottom = -screenH / 2;
  hudCamera.updateProjectionMatrix();
  renderer.setSize(screenW, screenH, false);
});

// ─── MOBILE CONTROLS ──────────────────────────────────────────────────────────
const mobileInput = { x: 0, z: 0 };
let mobileJump = false;

const mobileUI = document.createElement('div');
mobileUI.id = 'mobile-ui';
mobileUI.style.cssText = `
  position: absolute; inset: 0;
  pointer-events: none;
  display: ${isMobile() ? 'block' : 'none'};
`;
screen.appendChild(mobileUI);

const joyBase = document.createElement('div');
joyBase.style.cssText = `
  position: absolute; bottom: 40px; left: 40px;
  width: 110px; height: 110px;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  border: 2px solid rgba(255,255,255,0.35);
  pointer-events: auto;
  touch-action: none;
`;
mobileUI.appendChild(joyBase);

const joyKnob = document.createElement('div');
joyKnob.style.cssText = `
  position: absolute; top: 50%; left: 50%;
  width: 44px; height: 44px;
  border-radius: 50%;
  background: rgba(255,255,255,0.55);
  transform: translate(-50%, -50%);
  pointer-events: none;
`;
joyBase.appendChild(joyKnob);

const jumpBtn = document.createElement('div');
jumpBtn.style.cssText = `
  position: absolute; bottom: 40px; right: 40px;
  width: 70px; height: 70px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  border: 2px solid rgba(255,255,255,0.45);
  pointer-events: auto;
  touch-action: none;
  display: flex; align-items: center; justify-content: center;
  color: white; font-size: 28px; font-family: sans-serif;
  user-select: none;
`;
jumpBtn.textContent = '↑';
mobileUI.appendChild(jumpBtn);

const lookZone = document.createElement('div');
lookZone.style.cssText = `
  position: absolute;
  top: 0; right: 0;
  width: 50%; height: calc(100% - 140px);
  pointer-events: auto;
  touch-action: none;
`;
mobileUI.appendChild(lookZone);

let joyTouchId = null;
let joyOrigin  = { x: 0, y: 0 };
const JOY_RADIUS = 55;

joyBase.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.changedTouches[0];
  joyTouchId = t.identifier;
  const r = joyBase.getBoundingClientRect();
  joyOrigin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, { passive: false });

document.addEventListener('touchmove', e => {
  for (const t of e.changedTouches) {
    if (t.identifier === joyTouchId) {
      e.preventDefault();
      const dx = t.clientX - joyOrigin.x;
      const dy = t.clientY - joyOrigin.y;
      const dist = Math.min(Math.sqrt(dx * dx + dy * dy), JOY_RADIUS);
      const angle = Math.atan2(dy, dx);
      const nx = (dist / JOY_RADIUS) * Math.cos(angle);
      const ny = (dist / JOY_RADIUS) * Math.sin(angle);
      mobileInput.x = nx;
      mobileInput.z = ny;
      joyKnob.style.transform = `translate(calc(-50% + ${nx * JOY_RADIUS}px), calc(-50% + ${ny * JOY_RADIUS}px))`;
    }
  }
}, { passive: false });

document.addEventListener('touchend', e => {
  for (const t of e.changedTouches) {
    if (t.identifier === joyTouchId) {
      joyTouchId = null;
      mobileInput.x = 0;
      mobileInput.z = 0;
      joyKnob.style.transform = 'translate(-50%, -50%)';
    }
  }
});

jumpBtn.addEventListener('touchstart', e => { e.preventDefault(); mobileJump = true;  }, { passive: false });
jumpBtn.addEventListener('touchend',   e => { e.preventDefault(); mobileJump = false; }, { passive: false });

let lookTouchId = null;
let lastLook    = { x: 0, y: 0 };

lookZone.addEventListener('touchstart', e => {
  e.preventDefault();
  if (lookTouchId !== null) return;
  const t = e.changedTouches[0];
  lookTouchId = t.identifier;
  lastLook = { x: t.clientX, y: t.clientY };
}, { passive: false });

document.addEventListener('touchmove', e => {
  for (const t of e.changedTouches) {
    if (t.identifier === lookTouchId) {
      e.preventDefault();
      const dx = t.clientX - lastLook.x;
      const dy = t.clientY - lastLook.y;
      yaw   -= dx * 0.004;
      pitch -= dy * 0.004;
      pitch  = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch));
      lastLook = { x: t.clientX, y: t.clientY };
    }
  }
}, { passive: false });

document.addEventListener('touchend', e => {
  for (const t of e.changedTouches) {
    if (t.identifier === lookTouchId) lookTouchId = null;
  }
});

// --- HUD POS ---
const hudPos = document.getElementById("pos");

// --- ANIMATION LOOP ---
let lastPos = { x: 0, z: 0 };
let lastTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.1);
  myWorld.world.step(1 / 60, delta);

  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right   = new THREE.Vector3( Math.cos(yaw), 0, -Math.sin(yaw));

  const input = new THREE.Vector3();
  if (isLocked) {
    if (keys['KeyW']) input.add(forward);
    if (keys['KeyS']) input.sub(forward);
    if (keys['KeyA']) input.sub(right);
    if (keys['KeyD']) input.add(right);
    if (keys['KeyF']) screen.requestFullscreen();
    if (keys['KeyR'] && !lastKeys['KeyR']) cameraMode = cameraMode === "first" ? "third" : "first";
    if (keys['ShiftLeft']) player.crouch();
    else player.uncrouch();
  } else if (isMobile()) {
    input.add(forward.clone().multiplyScalar(-mobileInput.z));
    input.add(right.clone().multiplyScalar(mobileInput.x));
  }

  const wantsJump = (isLocked && keys['Space']) || mobileJump;
  player.update(input, yaw, wantsJump);
  car.update(new THREE.Vector3(), yaw, false);

  const px = player.position.x;
  const py = player.position.y;
  const pz = player.position.z;

  // --- CAMERA ---
  const target = new THREE.Vector3(px, py + player.eyeHeight, pz);
  const back = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    -Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch)
  );

  if (cameraMode === "first") {
    player.mesh.visible = false;
    camera.position.copy(target);
  } else {
    player.mesh.visible = true;
    const maxDist = 3;
    thirdPersonRay.set(target, back.clone().normalize());
    thirdPersonRay.far = maxDist;
    const hits = thirdPersonRay.intersectObjects(
      myWorld.scene.children.filter(c => c !== player.mesh),
      true
    );
    const actualDist = hits.length > 0 ? Math.min(hits[0].distance - 0.1, maxDist) : maxDist;
    camera.position.copy(target).addScaledVector(back, actualDist);
  }

  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
  camera.rotation.z = 0;

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'update',
      x: px, y: py, z: pz,
      rotationY: yaw
    }));
  }

  renderer.clear();
  renderer.render(myWorld.scene, camera);
  renderer.clearDepth();
  renderer.render(hudScene, hudCamera);

  const now = performance.now();
  const dt = (now - lastTime) / 1000;
  const dx = px - lastPos.x;
  const dz = pz - lastPos.z;
  const ups = Math.sqrt(dx * dx + dz * dz) / dt;
  lastPos = { x: px, z: pz };
  lastTime = now;

  if (hudPos) {
    hudPos.textContent = `X: ${px.toFixed(2)}, Y: ${py.toFixed(2)}, Z: ${pz.toFixed(2)} | SPD: ${ups.toFixed(2)} u/s`;
  }

  Object.assign(lastKeys, keys);
}

animate();
