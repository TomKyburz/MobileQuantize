import * as THREE from 'three';

export const loader = new THREE.TextureLoader();

// ─── Texture paths ────────────────────────────────────────────────────────────
const ASSETS = {
  adam:      'assets/cabin.jpg',
  floor:     'assets/ground.png',
  water:     'assets/water.png',
  void1:     'assets/sky.png',
  roof:      'https://quantize.me/img/Adam.jpg',
  face:      'https://quantize.me/img/Adam.jpg',
  side:      'assets/cabin.jpg',
  sky:       'assets/backdrop.png',
  floor1:    'assets/floor.png',
  wall1:     'assets/wall.png',
  ceiling1:  'assets/ceiling.png',
};

// ─── Load all textures up-front and apply shared defaults ────────────────────
// Sharing the same THREE.Texture for identical source paths avoids duplicate
// GPU uploads and redundant HTTP requests.
const _cache = new Map();
function loadOnce(url, pixelated = true) {
  if (_cache.has(url)) return _cache.get(url);
  const tex = loader.load(url);
  if (pixelated) {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter  = THREE.NearestFilter;
  }
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  _cache.set(url, tex);
  return tex;
}

// Public texture exports
export const adam         = ASSETS.adam;           // URL string (used by World)
export const floorTexture = loadOnce(ASSETS.floor);
export const waterTexture = loadOnce(ASSETS.water);
export const void1Texture = loadOnce(ASSETS.void1);
export const roofTexture  = loadOnce(ASSETS.roof);
export const faceTex      = loadOnce(ASSETS.face);
export const sideTex      = loadOnce(ASSETS.side); // same URL → same cached texture
export const skyTexture   = loadOnce(ASSETS.sky);
export const floor1       = loadOnce(ASSETS.floor1);
export const wall1        = loadOnce(ASSETS.wall1);
export const ceiling1 = loadOnce(ASSETS.ceiling1);
