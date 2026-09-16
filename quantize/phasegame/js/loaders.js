import * as THREE from 'https://unpkg.com/three@latest/build/three.module.js';
import { PointerLockControls } from 'https://unpkg.com/three@latest/examples/jsm/controls/PointerLockControls.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

const loader = new THREE.TextureLoader();
const adam = "assets/cabin.jpg";
const floorTexture = loader.load('assets/ground.png');
const roofTexture = loader.load('https://quantize.me/img/Adam.jpg');
const faceTex = loader.load('https://quantize.me/img/Adam.jpg');
const sideTex = loader.load('assets/cabin.jpg');
const skyTexture = loader.load('assets/sunset.jpg');
