import * as THREE from 'three';
import * as CANNON from 'cannon';

import { World2 } from './js/world2.js';
import { loader, adam, floorTexture, waterTexture, void1Texture, roofTexture, faceTex, sideTex, skyTexture } from './js/assetloader.js';
import { jumpVelocity, maxSpeed, acceleration } from './js/variables.js';

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
// connectWS();

const screen = document.getElementById("game-container");
const full = document.getElementById("lines");
const grid = document.getElementById("grid");
let screenW = screen.clientWidth;
let screenH = screen.clientHeight;

window.addEventListener('resize', () => {
  screenW = screen.clientWidth;
  screenH = screen.clientHeight;
  camera.aspect = screenW / screenH;
  camera.updateProjectionMatrix();
  renderer.setSize(screenW, screenH, false);
});

full.addEventListener('click', () => {
  screen.requestFullscreen();
  renderer.setSize(screenW, screenH);
});

grid.addEventListener('click', () => {
  cameraMode = cameraMode === "first" ? "third" : "first"
});

const hudPos = document.getElementById("pos");

// --- CREATE WORLD ---
const myWorld = new World2();

// --- CAMERA & RENDERER ---
const camera = new THREE.PerspectiveCamera(65, screenW / screenH, 0.1, 1000);
myWorld.scene.add(camera);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(screenW, screenH, false);
screen.appendChild(renderer.domElement);

// --- POINTER LOCK (desktop) ---
let isLocked = false;
const isMobile = () => 'ontouchstart' in window;

screen.addEventListener('click', () => {
  if (!isMobile()) screen.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  isLocked = document.pointerLockElement === screen;
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
document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup',   e => keys[e.code] = false);

// --- CAMERA MODE ---
let cameraMode = "first";
document.addEventListener('keydown', e => {
  if (e.code === 'KeyR') cameraMode = cameraMode === "first" ? "third" : "first";
});

// ─── MOBILE CONTROLS ──────────────────────────────────────────────────────────
// Joystick: bottom-left. Look drag: right half of screen. Jump: bottom-right.

const mobileInput = { x: 0, z: 0 };  // normalised [-1, 1]
let mobileJump = false;

// Inject mobile UI into the HUD
const mobileUI = document.createElement('div');
mobileUI.id = 'mobile-ui';
mobileUI.style.cssText = `
  position: absolute; inset: 0;
  pointer-events: none;
  display: ${isMobile() ? 'block' : 'none'};
`;
screen.appendChild(mobileUI);

// Joystick base
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

// Jump button
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

// Look zone — right half, above jump button
const lookZone = document.createElement('div');
lookZone.style.cssText = `
  position: absolute;
  top: 0; right: 0;
  width: 50%; height: calc(100% - 140px);
  pointer-events: auto;
  touch-action: none;
`;
mobileUI.appendChild(lookZone);

// Joystick touch handling
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

// Jump button
jumpBtn.addEventListener('touchstart', e => { e.preventDefault(); mobileJump = true;  }, { passive: false });
jumpBtn.addEventListener('touchend',   e => { e.preventDefault(); mobileJump = false; }, { passive: false });

// Look drag
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

// ─── PLAYER BODY & MESH ───────────────────────────────────────────────────────
const playerBody = new CANNON.Body({
  mass: 60,
  shape: new CANNON.Box(new CANNON.Vec3(0.25, 0.75, 0.25)),
  fixedRotation: true,
  position: new CANNON.Vec3(0, 3, 0.001)
});
myWorld.world.addBody(playerBody);

[faceTex, sideTex].forEach(t => { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; });

const pMaterials = [
  new THREE.MeshPhongMaterial({ map: sideTex }),
  new THREE.MeshPhongMaterial({ map: sideTex }),
  new THREE.MeshPhongMaterial({ map: sideTex }),
  new THREE.MeshPhongMaterial({ map: sideTex }),
  new THREE.MeshPhongMaterial({ map: faceTex }),
  new THREE.MeshPhongMaterial({ map: sideTex }),
];

const playerMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 0.5), pMaterials);
myWorld.scene.add(playerMesh);

// --- JUMP HANDLING ---
let canJump = false;
const upAxis = new CANNON.Vec3(0, 1, 0);

playerBody.addEventListener('collide', event => {
  const contact = event.contact;
  let contactNormal = new CANNON.Vec3();
  if (contact.bi.id === playerBody.id) contact.ni.negate(contactNormal);
  else contactNormal.copy(contact.ni);
  if (contactNormal.dot(upAxis) > 0.5) canJump = true;
});

// --- ANIMATION LOOP ---
const velocity = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);
  myWorld.world.step(1 / 60, delta);

  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right   = new THREE.Vector3( Math.cos(yaw), 0, -Math.sin(yaw));

  const input = new THREE.Vector3();

  if (isLocked) {
    // Desktop keyboard
    if (keys['KeyW']) input.add(forward);
    if (keys['KeyS']) input.sub(forward);
    if (keys['KeyA']) input.sub(right);
    if (keys['KeyD']) input.add(right);
  } else if (isMobile()) {
    // Mobile joystick
    input.add(forward.clone().multiplyScalar(-mobileInput.z));
    input.add(right.clone().multiplyScalar(mobileInput.x));
  }

  if (input.lengthSq() > 0) input.normalize();

  velocity.lerp(input.multiplyScalar(maxSpeed), acceleration * delta);
  playerBody.velocity.x = velocity.x;
  playerBody.velocity.z = velocity.z;
  playerBody.linearDamping = 0;

  const wantsJump = (isLocked && keys['Space']) || mobileJump;
  if (wantsJump && canJump) {
    playerBody.velocity.y = jumpVelocity;
    canJump = false;
  }

  // Sync mesh
  playerMesh.position.copy(playerBody.position);
  playerMesh.rotation.y = yaw;

  // Camera
  const px = playerBody.position.x;
  const py = playerBody.position.y;
  const pz = playerBody.position.z;

  if (cameraMode === "first") {
    playerMesh.visible = false;
    camera.position.set(px, py + 0.75, pz);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
    camera.rotation.z = 0;
  } else {
    playerMesh.visible = true;
    const dist = 4;
    camera.position.set(
      px + dist * Math.sin(yaw) * Math.cos(pitch),
      py + 0.75 - dist * Math.sin(pitch),
      pz + dist * Math.cos(yaw) * Math.cos(pitch),
    );
    camera.lookAt(px, py + 0.75, pz);
  }

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'update',
      x: playerBody.position.x,
      y: playerBody.position.y,
      z: playerBody.position.z,
      rotationY: playerMesh.rotation.y
    }));
  }

  renderer.render(myWorld.scene, camera);

  if (hudPos) {
    hudPos.textContent = `X: ${px.toFixed(2)}, Y: ${py.toFixed(2)}, Z: ${pz.toFixed(2)}`;
  }
}

animate();
