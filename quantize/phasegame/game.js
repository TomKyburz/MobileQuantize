import * as THREE from 'https://unpkg.com/three@latest/build/three.module.js';
import { PointerLockControls } from 'https://unpkg.com/three@latest/examples/jsm/controls/PointerLockControls.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

const loader = new THREE.TextureLoader();

const adam = "assets/cabin.jpg";
const floorTexture = loader.load('assets/grass.png');
const roofTexture = loader.load('https://quantize.me/img/Adam.jpg');

const screen = document.getElementById("game-container");
let screenW = screen.clientWidth;
let screenH = screen.clientHeight;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, screenW / screenH, 0.1, 1000);

const keys = {};
document.addEventListener('keydown', (e) => { keys[e.code] = true; });
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

const renderer = new THREE.WebGLRenderer();
renderer.setSize(screenW, screenH);
renderer.setClearColor(0x000040, 1);
screen.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
    screenW = screen.clientWidth;
    screenH = screen.clientHeight;
    camera.aspect = screenW / screenH;
    camera.updateProjectionMatrix();
    renderer.setSize(screenW, screenH);
});

const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(camera);

document.addEventListener('click', (event) => {
    if (event.target.tagName !== 'BUTTON') {
        controls.lock();
    }
});

// --- TOGGLE LOGIC ---
let activePlayer = 1;
window.grid = function() {
    activePlayer = activePlayer === 1 ? 2 : 1;
};

// --- FLOOR & ROOF ---
floorTexture.magFilter = THREE.NearestFilter;
floorTexture.minFilter = THREE.NearestFilter;
floorTexture.wrapS = THREE.RepeatWrapping;
floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set(10, 10);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshBasicMaterial({ map: floorTexture, side: THREE.DoubleSide }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const roof = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), new THREE.MeshBasicMaterial({ map: roofTexture, side: THREE.DoubleSide }));
roof.rotation.x = -Math.PI / 2;
roof.position.y = 18;
scene.add(roof);

function createWall(x, y, z, rotationY, textureUrl) {
    const wallTexture = loader.load(textureUrl);
    wallTexture.magFilter = THREE.NearestFilter;
    wallTexture.minFilter = THREE.NearestFilter;
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(50, 20), new THREE.MeshBasicMaterial({ map: wallTexture, side: THREE.DoubleSide }));
    wall.position.set(x, y, z);
    wall.rotation.y = rotationY;
    scene.add(wall);
}

createWall(0, 10, -25, 0, adam);
createWall(0, 10, 25, 0, adam);
createWall(-25, 10, 0, Math.PI / 2, adam);
createWall(25, 10, 0, Math.PI / 2, adam);

const hudPos = document.getElementById("pos");

// --- PHYSICS ---
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

const groundBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

// Player 1
const playerBody = new CANNON.Body({ mass: 60, shape: new CANNON.Sphere(1), fixedRotation: true, position: new CANNON.Vec3(5, 3, -5) });
world.addBody(playerBody);
const playerMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }));
scene.add(playerMesh);

// Player 2
const player2Body = new CANNON.Body({ mass: 60, shape: new CANNON.Box(new CANNON.Vec3(0.5, 1.5, 0.5)), fixedRotation: true, position: new CANNON.Vec3(5, 3, -12) });
world.addBody(player2Body);
const faceTex = loader.load('https://quantize.me/img/Adam.jpg');
const sideTex = loader.load('assets/cabin.jpg');
[faceTex, sideTex].forEach(t => { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; });
const p2Materials = [
    new THREE.MeshBasicMaterial({ map: sideTex }), new THREE.MeshBasicMaterial({ map: sideTex }),
    new THREE.MeshBasicMaterial({ map: sideTex }), new THREE.MeshBasicMaterial({ map: sideTex }),
    new THREE.MeshBasicMaterial({ map: faceTex }), new THREE.MeshBasicMaterial({ map: sideTex }),
];
const player2Mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 1), p2Materials);
scene.add(player2Mesh);

// --- CAMERA SETTINGS ---
const cameraOffset = new THREE.Vector3(0, 3, 6);

function animate() {
    requestAnimationFrame(animate);
    world.fixedStep();

    const currentBody = activePlayer === 1 ? playerBody : player2Body;
    const currentMesh = activePlayer === 1 ? playerMesh : player2Mesh;

    if (controls.isLocked) {
        // 1. Get Camera Euler to separate Yaw (Y) from Pitch (X)
        const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');

        // 2. Rotate the Player Mesh ONLY on the Y axis (Yaw)
        currentMesh.rotation.y = euler.y;

        // 3. Horizontal movement based on where camera faces
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, euler.y, 0)));
        const sideVector = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction);

        currentBody.velocity.x = 0;
        currentBody.velocity.z = 0;

        const speed = 10;
        if (keys['KeyW']) { currentBody.velocity.x += direction.x * speed; currentBody.velocity.z += direction.z * speed; }
        if (keys['KeyS']) { currentBody.velocity.x -= direction.x * speed; currentBody.velocity.z -= direction.z * speed; }
        if (keys['KeyA']) { currentBody.velocity.x += sideVector.x * speed; currentBody.velocity.z += sideVector.z * speed; }
        if (keys['KeyD']) { currentBody.velocity.x -= sideVector.x * speed; currentBody.velocity.z -= sideVector.z * speed; }
        if (keys['Space'] && Math.abs(currentBody.velocity.y) < 0.01) currentBody.velocity.y = 5;
    }

    // --- POSITION SYNC ---
    playerMesh.position.copy(playerBody.position);
    player2Mesh.position.copy(player2Body.position);

    // --- THIRD PERSON CAMERA FIX ---
    // Instead of using lookAt (which breaks mouse control),
    // we move the camera relative to the player's CURRENT rotation.
    const relativeOffset = cameraOffset.clone().applyQuaternion(currentMesh.quaternion);
    camera.position.copy(currentBody.position).add(relativeOffset);

    if(hudPos) hudPos.textContent = `P${activePlayer} | X: ${camera.position.x.toFixed(2)}, Y: ${camera.position.y.toFixed(2)}, Z: ${camera.position.z.toFixed(2)}`;
    renderer.render(scene, camera);
}

animate();
