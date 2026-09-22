import * as THREE from 'three';

const screen = document.getElementById("world");

let screenW = screen.clientWidth;
let screenH = screen.clientHeight;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  65,
  screenW / screenH,
  0.1,
  1000
);

camera.position.z = 5;


/* =========================
   TRANSPARENT RENDERER
   ========================= */

const renderer = new THREE.WebGLRenderer({
  alpha: true
});

renderer.setSize(screenW, screenH);

// Fully transparent background
renderer.setClearColor(0x000000, 0);

screen.appendChild(renderer.domElement);


/* =========================
   RESIZE
   ========================= */

window.addEventListener('resize', () => {

  screenW = screen.clientWidth;
  screenH = screen.clientHeight;

  camera.aspect = screenW / screenH;
  camera.updateProjectionMatrix();

  renderer.setSize(screenW, screenH);
});


/* =========================
   CLICK
   ========================= */

screen.addEventListener('click', () => {
  window.location.href = "map/index.html";
});


/* =========================
   CUBE
   ========================= */

const colors = [
  0x006fff,
  0x006fff,
  0x559fff,
  0x559fff,
  0x1d7df9,
  0xfff
];

const materials = colors.map(
  color => new THREE.MeshBasicMaterial({ color })
);

const geometry = new THREE.BoxGeometry(3, 3, 3);

const cube = new THREE.Mesh(
  geometry,
  materials
);

scene.add(cube);


/* =========================
   ANIMATION
   ========================= */

function animate() {

  requestAnimationFrame(animate);

  cube.rotation.x += 0.008;
  cube.rotation.y += 0.008;

  renderer.render(scene, camera);
}

animate();
