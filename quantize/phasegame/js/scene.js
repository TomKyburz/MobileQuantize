// /js/scene.js
import * as THREE from 'three';
export function createScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);
  scene.fog = new THREE.FogExp2(0x000000, 0.0028);

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x000040, 1);
  container.appendChild(renderer.domElement);

  const light = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(light);

  return { scene, renderer };
}
