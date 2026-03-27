import * as THREE from 'three';

export const loader = new THREE.TextureLoader();

export const adam = "assets/cabin.jpg";
export const floorTexture = loader.load('assets/ground.png');
export const floor1 = loader.load('assets/floor.png');
export const test = loader.load('assets/test.png');
export const test1 = loader.load('assets/test1.png');
export const waterTexture = loader.load('assets/water.png');
export const void1Texture = loader.load('assets/sky.png');
export const roofTexture = loader.load('https://quantize.me/img/Adam.jpg');
export const faceTex = loader.load('https://quantize.me/img/Adam.jpg');
export const sideTex = loader.load('assets/cabin.jpg');
export const skyTexture = loader.load('assets/backdrop.png');

[floorTexture, waterTexture, void1Texture, roofTexture, faceTex, sideTex, skyTexture].forEach(tex => {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
});
