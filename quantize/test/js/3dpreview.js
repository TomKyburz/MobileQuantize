import * as THREE from 'three';
const screen = document.getElementById("world");
let screenW = screen.clientWidth;
let screenH = screen.clientHeight;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, screenW / screenH, 0.1, 1000);
camera.position.z = 5;
// scene.background = 0xff0000;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(screenW, screenH);
renderer.setClearColor( 0x000040, 1 );
screen.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  // Update variables to the new div size
  screenW = screen.clientWidth;
  screenH = screen.clientHeight;

  // Update Camera aspect ratio to prevent stretching
  camera.aspect = screenW / screenH;
  camera.updateProjectionMatrix();
  // Update Renderer size
  renderer.setSize(screenW, screenH);
});

screen.addEventListener('click', () => {
  window.location.href = "quantize/phasegame2/index.html";
});


const colors = [
  0x006fff,
  0x006fff,
  0x559fff,
  0x559fff,
  0x1d7df9,
  0xfff
];

const materials = colors.map(color => new THREE.MeshBasicMaterial({ color }));
const geometry = new THREE.BoxGeometry(3, 3, 3);
const cube = new THREE.Mesh(geometry, materials);
scene.add(cube);

function animate() {
    requestAnimationFrame(animate);
    cube.rotation.x += 0.02;
    cube.rotation.y += 0.02;
    renderer.render(scene, camera);
}

animate();
