import * as THREE from 'three';
import { PointerLockControls } from 'pointerlock';
import * as CANNON from 'cannon';
import {loader,adam,floorTexture,waterTexture,void1Texture,roofTexture,faceTex,sideTex,skyTexture} from './js/assetloader.js';
import {jumpVelocity,maxSpeed,acceleration} from './js/variables.js'

const clock = new THREE.Clock();

let ws;
let playerId;
const otherPlayers = {};
function connectWS(){
  ws = new WebSocket(`ws://${location.host}/ws`);
  ws.onmessage = e=>{
    const msg = JSON.parse(e.data);
    if(msg.type==='init'){ playerId=msg.id }
    if(msg.type==='players'){
      msg.players.forEach(p=>{
        if(!otherPlayers[p.id]){
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(1,3,1),
            new THREE.MeshPhongMaterial({color:0x0000ff})
          );
          scene.add(mesh);
          otherPlayers[p.id]=mesh;
        }
        otherPlayers[p.id].position.set(p.x,p.y,p.z);
        otherPlayers[p.id].rotation.y = p.rotationY;
      })
    }
    if(msg.type==='disconnect'){
      if(otherPlayers[msg.id]){
        scene.remove(otherPlayers[msg.id]);
        delete otherPlayers[msg.id];
      }
    }
  }
  ws.onclose = ()=>{ setTimeout(connectWS,1000) }
}
connectWS();

const screen = document.getElementById("game-container");
const full = document.getElementById("lines");
window.addEventListener('resize', () => {
    screenW = screen.clientWidth;
    screenH = screen.clientHeight;
    camera.aspect = screenW / screenH;
    camera.updateProjectionMatrix();
    renderer.setSize(screenW, screenH);
});
full.addEventListener('click', (event) => {
  screen.requestFullscreen();
  renderer.setSize(screenW, screenH);
});
const hudPos = document.getElementById("pos");
let screenW = screen.clientWidth;
let screenH = screen.clientHeight;

const world = new CANNON.World();
world.gravity.set(0, -18, 0);
world.defaultContactMaterial.friction = 0;
world.defaultContactMaterial.restitution = 0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);
const camera = new THREE.PerspectiveCamera(65, screenW / screenH, 0.1, 1000);
camera.position.set(0, 5, 0);
camera.rotation.x = 0;
camera.rotation.y = -Math.PI / 2;
camera.rotation.z = 0;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(screenW, screenH, false);
renderer.setClearColor(0x000040, 1);
screen.appendChild(renderer.domElement);
const controls = new PointerLockControls(camera, renderer.domElement);
document.addEventListener('click', (event) => {
    if (event.target.tagName !== 'BUTTON') {
        controls.lock();
    }
});
const keys = {};
document.addEventListener('keydown', (e) => { keys[e.code] = true; });
document.addEventListener('keyup', (e) => { keys[e.code] = false; });
const directionalLight = new THREE.AmbientLight( 0xffffff, 0.5 );
scene.add(directionalLight);
const atmosphereColor = 0x0C001C; // Light sky blue
scene.fog = new THREE.Fog(atmosphereColor, 1, 650); // Objects disappear at 300 units
scene.background = new THREE.Color(atmosphereColor);
renderer.setClearColor(atmosphereColor);

floorTexture.repeat.set(10, 10);

const floorGeometry = new THREE.CylinderGeometry(50, 50, 0.01, 8);
const floorMaterial = new THREE.MeshPhongMaterial({
  map: floorTexture,
  side: THREE.DoubleSide
});

const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.position.y = -0.5;
scene.add(floor);

const floorShape = new CANNON.Cylinder(50, 50, 1, 8);

const floorBody = new CANNON.Body({
  mass: 0,
  shape: floorShape
});

floorBody.position.set(0, -0.5, 0);

world.addBody(floorBody);

waterTexture.magFilter = THREE.NearestFilter;
waterTexture.minFilter = THREE.NearestFilter;
waterTexture.wrapS = THREE.RepeatWrapping;
waterTexture.wrapT = THREE.RepeatWrapping;
waterTexture.repeat.set(4, 4);

const void0 = new THREE.Mesh(
  new THREE.PlaneGeometry(1100, 1100),
  new THREE.MeshPhongMaterial({ map: waterTexture, side: THREE.DoubleSide })
);
void0.rotation.x = -Math.PI / 2;
void0.position.set(0, -25, 0);
scene.add(void0);

const void1 = new THREE.Mesh(new THREE.PlaneGeometry(1100,1100), new THREE.MeshPhongMaterial({ map: void1Texture, side: THREE.DoubleSide }));
void1.rotation.x = -Math.PI / 2;
void1.position.set(0,276,0)
scene.add(void1);

skyTexture.wrapS = THREE.RepeatWrapping;
skyTexture.wrapT = THREE.ClampToEdgeWrapping;
skyTexture.magFilter = THREE.NearestFilter;
skyTexture.minFilter = THREE.NearestFilter;
skyTexture.repeat.set(8,1);

const skyGeometry = new THREE.CylinderGeometry(
    500,   // top 50
    500,   // bottom 50
    300,   // height
    12,    // ← THIS makes it a dodecagon
    1,
    true   // openEnded (no caps)
);

const skyMaterial = new THREE.MeshBasicMaterial({
    map: skyTexture,
    side: THREE.BackSide  // render inside
});

const sky = new THREE.Mesh(skyGeometry, skyMaterial);
sky.position.y = 126; // lift it up so horizon aligns
scene.add(sky);

const sideLength = 2 * 50 * Math.sin(Math.PI / 8);

function createWall(x, y, z, rotationY, textureUrl) {
    // --- Visual Mesh ---
    const wallTexture = loader.load(textureUrl);
    wallTexture.magFilter = THREE.NearestFilter;
    wallTexture.minFilter = THREE.NearestFilter;
    const wallMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(sideLength, 25),
        new THREE.MeshPhongMaterial({ map: wallTexture, side: THREE.DoubleSide })
    );
    wallMesh.position.set(x, y, z);
    wallMesh.rotation.y = rotationY;
    scene.add(wallMesh);

    // --- Physics Body ---
    // Cannon boxes use "half-extents" (8 from center to edge)
    // Width: 50/2 = 25, Height: 20/2 = 10, Thickness: 0.1
    const wallShape = new CANNON.Box(new CANNON.Vec3(25, 12.5, 0.5));
    const wallBody = new CANNON.Body({
        mass: 0, // Mass 0 makes it a static object (unmovable)
        shape: wallShape
    });

    wallBody.position.set(x, y, z);
    // Apply the same rotation to the physics body
    wallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotationY);

    world.addBody(wallBody);
}

const wallDistance = 50 * Math.cos(Math.PI / 8);

for (let i = 0; i < 8; i++) {
  const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;

  const x = Math.sin(angle) * wallDistance;
  const z = Math.cos(angle) * wallDistance;

  createWall(x, -12.5, z, angle, adam);
}

const bulb = new THREE.PointLight(0xF59C27, 1000, 0, 2);

// Define the (x, y, z) coordinates for each light
const positions = [
  [-25, 8, -25],
  [25, 8, 25],
  [25, 8, -25],
  [-25, 8, 25],
  [0,-1,0]
];

positions.forEach(pos => {
  const light = new THREE.PointLight(0xF59C27, 400, 0, 2);
  light.position.set(...pos); // Use spread operator to pass x, y, z
  scene.add(light);
});

const bulbLight = new THREE.PointLight(0xF59C27, 200, 0, 2);
bulbLight.position.set(0,3,0)
scene.add(bulbLight)

const cameraPivot = new THREE.Object3D();
scene.add(cameraPivot);
cameraPivot.add(camera);
let cameraMode = "first"; // "first" or "third"
let yaw = 0;
let pitch = 0;
document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR') {
        cameraMode = cameraMode === "first" ? "third" : "first";
    }
});

document.addEventListener('mousemove', (e) => {
  if (!controls.isLocked) return;

  if (cameraMode === "third") {
    yaw -= e.movementX * 0.002;
    pitch += e.movementY * 0.002;

    // Clamp vertical look
    pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch));
  }
});

const thirdPersonOffset = new THREE.Vector3(0, 2, 6);
// const groundBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
// groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
// world.addBody(groundBody);

const playerBody = new CANNON.Body({ mass: 60, shape: new CANNON.Box(new CANNON.Vec3(0.5, 1.5, 0.5)), fixedRotation: true, position: new CANNON.Vec3(0, 3, 0.001) });
world.addBody(playerBody);
[faceTex, sideTex].forEach(t => { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; });
const pMaterials = [
    new THREE.MeshPhongMaterial({ map: sideTex }), new THREE.MeshPhongMaterial({ map: sideTex }),
    new THREE.MeshPhongMaterial({ map: sideTex }), new THREE.MeshPhongMaterial({ map: sideTex }),
    new THREE.MeshPhongMaterial({ map: sideTex }), new THREE.MeshPhongMaterial({ map: faceTex }),
];
const playerMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 1), pMaterials);
playerMesh.position.set(0,1.5,0)
scene.add(playerMesh);

 // tweak to adjust jump height
let canJump = false;       // is the player grounded?
const upAxis = new CANNON.Vec3(0, 1, 0);

playerBody.addEventListener('collide', (event) => {

  const contact = event.contact;
  let contactNormal = new CANNON.Vec3();

  // Make sure the normal always points *toward the player*
  if (contact.bi.id === playerBody.id) {
    contact.ni.negate(contactNormal);
  } else {
    contactNormal.copy(contact.ni);
  }

  if (contactNormal.dot(upAxis) > 0.5) {
    canJump = true;
  }

});

// --- CAMERA SETTINGS ---
const cameraOffset = new THREE.Vector3(0, 3, 6);
const velocity = new THREE.Vector3();
function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);
  world.step(1 / 60, delta);

  // Store velocity yourself
  // const velocity = new THREE.Vector3();

  if (controls.isLocked) {

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(new THREE.Vector3(0,1,0), forward).normalize();

    let input = new THREE.Vector3();

    if (keys['KeyW']) input.add(forward);
    if (keys['KeyS']) input.sub(forward);
    if (keys['KeyA']) input.add(right);
    if (keys['KeyD']) input.sub(right);

    if (input.lengthSq() > 0) {
      input.normalize();
    }

    const targetVelocity = input.multiplyScalar(maxSpeed);

    // Smooth acceleration
    velocity.lerp(targetVelocity, acceleration * delta);

    playerBody.velocity.x = velocity.x;
    playerBody.velocity.z = velocity.z;

    // Jump
    if (keys['Space'] && canJump) {
      playerBody.velocity.y = jumpVelocity; // instant upward velocity
      canJump = false; // prevent double jump
    }
    playerBody.linearDamping = 0; // 0 = no slowdown from “air resistance”

  }

  // Sync mesh to physics body
  playerMesh.position.copy(playerBody.position);

  // --- Player mesh rotation ---

  function lerpAngle(a, b, t) {
    let diff = b - a;

    // Wrap difference to [-PI, PI]
    diff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;

    return a + diff * t;
  }
  if (cameraMode === "third") {
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const targetYaw = Math.atan2(forward.x, forward.z);
    playerMesh.rotation.y = lerpAngle(playerMesh.rotation.y, targetYaw, 0.15);
  }

  // --- CAMERA SYSTEM ---

  const playerPos = playerBody.position;

  if (cameraMode === "first") {

    camera.position.copy(playerPos);
    camera.position.y += 1.5;

  } else {

    if (cameraMode === "third") {

        // Compute offset from player using yaw/pitch
        const offsetX = 8 * Math.sin(yaw) * Math.cos(pitch);
        const offsetZ = 8 * Math.cos(yaw) * Math.cos(pitch);
        const offsetY = 3 + 8 * Math.sin(pitch);

        camera.position.set(
            playerPos.x - offsetX,
            playerPos.y + offsetY,
            playerPos.z - offsetZ
        );

        camera.lookAt(
            playerPos.x,
            playerPos.y + 1.5, // eyes height
            playerPos.z
        );
    }
  }

  // Send player position & rotation to server
if(ws && ws.readyState===WebSocket.OPEN){
  ws.send(JSON.stringify({
    type:'update',
    x: playerBody.position.x,
    y: playerBody.position.y,
    z: playerBody.position.z,
    rotationY: playerMesh.rotation.y
  }))
}

  renderer.render(scene, camera);

  if (hudPos) {
    hudPos.textContent =
      `X: ${playerBody.position.x.toFixed(2)}, ` +
      `Y: ${playerBody.position.y.toFixed(2)}, ` +
      `Z: ${playerBody.position.z.toFixed(2)}`;
  }
}
// function animate() {
//     requestAnimationFrame(animate);
//
//     const delta = Math.min(clock.getDelta(), 0.1);
//
//     // --- SETTINGS ---
//     const speed = 100
//     const verticalSpeed = 100;  // up/down speed
//
//     if (controls.isLocked) {
//
//         const moveAmount = speed * delta;
//
//         // Forward / Back
//         if (keys['KeyW']) controls.moveForward(moveAmount);
//         if (keys['KeyS']) controls.moveForward(-moveAmount);
//
//         // Left / Right
//         if (keys['KeyA']) controls.moveRight(-moveAmount);
//         if (keys['KeyD']) controls.moveRight(moveAmount);
//
//         // Up / Down (noclip vertical movement)
//         if (keys['Space']) {
//             camera.position.y += verticalSpeed * delta;
//         }
//         if (keys['ShiftLeft']) {
//             camera.position.y -= verticalSpeed * delta;
//         }
//     }
//
//     renderer.render(scene, camera);
//     if(hudPos) hudPos.textContent = `X: ${camera.position.x.toFixed(2)}, Y: ${camera.position.y.toFixed(2)}, Z: ${camera.position.z.toFixed(2)}`;
// }

animate();
