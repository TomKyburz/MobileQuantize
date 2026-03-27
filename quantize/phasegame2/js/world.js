import * as THREE from 'three';
import * as CANNON from 'cannon';
import {
  loader,
  adam,
  floorTexture, waterTexture, void1Texture,
  faceTex, sideTex, skyTexture,
} from '../js/assetloader.js';

// Pre-compute wall geometry constant once (shared across all wall instances)
const WALL_HALF_W = 50 * Math.sin(Math.PI / 8); // half-width of each octagon face
const WALL_HEIGHT  = 25;
const WALL_HALF_H  = WALL_HEIGHT / 2;

export class World {
  constructor() {
    this.scene = new THREE.Scene();
    this.world = new CANNON.World();
    this.world.gravity.set(0, -18, 0);
    this.world.broadphase = new CANNON.SAPBroadphase(this.world); // faster than NaiveBroadphase
    this.world.defaultContactMaterial.friction    = 0;
    this.world.defaultContactMaterial.restitution = 0;

    // Shared geometry for all 8 walls — created once, reused by every Mesh
    this._wallGeometry = new THREE.PlaneGeometry(WALL_HALF_W * 2, WALL_HEIGHT);
    // Shared CANNON shape for all 8 walls
    this._wallShape = new CANNON.Box(new CANNON.Vec3(WALL_HALF_W, WALL_HALF_H, 0.5));

    this.initScene();
  }

  initScene() {
    // ── Atmosphere ──────────────────────────────────────────────────────────
    const atmosphereColor = 0x0C001C;
    this.scene.background = new THREE.Color(atmosphereColor);
    this.scene.fog = new THREE.Fog(atmosphereColor, 1, 650);

    // Ambient only — directional name was misleading in original
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // ── Floor ───────────────────────────────────────────────────────────────
    floorTexture.repeat.set(10, 10);
    const floor = new THREE.Mesh(
      new THREE.CylinderGeometry(50, 50, 0.01, 8),
      new THREE.MeshPhongMaterial({ map: floorTexture, side: THREE.DoubleSide }),
    );
    floor.position.y = -0.5;
    this.scene.add(floor);

    const floorBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Cylinder(50, 50, 1, 8),
    });
    floorBody.position.set(0, -0.5, 0);
    this.world.addBody(floorBody);

    // ── Water plane ─────────────────────────────────────────────────────────
    waterTexture.repeat.set(4, 4);
    const voidPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1100, 1100),
      new THREE.MeshPhongMaterial({ map: waterTexture, side: THREE.DoubleSide }),
    );
    voidPlane.rotation.x = -Math.PI / 2;
    voidPlane.position.set(0, -25, 0);
    this.scene.add(voidPlane);

    // ── Upper void plane ────────────────────────────────────────────────────
    const void1 = new THREE.Mesh(
      new THREE.PlaneGeometry(1100, 1100),
      new THREE.MeshPhongMaterial({ map: void1Texture, side: THREE.DoubleSide }),
    );
    void1.rotation.x = -Math.PI / 2;
    void1.position.set(0, 276, 0);
    this.scene.add(void1);

    // ── Sky cylinder ────────────────────────────────────────────────────────
    skyTexture.wrapS  = THREE.RepeatWrapping;
    skyTexture.wrapT  = THREE.ClampToEdgeWrapping;
    skyTexture.repeat.set(8, 1);
    const sky = new THREE.Mesh(
      new THREE.CylinderGeometry(500, 500, 300, 12, 1, true),
      new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide }),
    );
    sky.position.y = 126;
    this.scene.add(sky);

    // ── Octagon walls ───────────────────────────────────────────────────────
    const wallDistance = 50 * Math.cos(Math.PI / 8);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const x = Math.sin(angle) * wallDistance;
      const z = Math.cos(angle) * wallDistance;
      this._createWall(x, -WALL_HALF_H, z, angle, adam);
    }

    // ── Point lights ────────────────────────────────────────────────────────
    const lightPositions = [
      [-25, 8, -25], [25, 8, 25], [25, 8, -25], [-25, 8, 25], [0, -1, 0],
    ];
    for (const pos of lightPositions) {
      const light = new THREE.PointLight(0xF59C27, 400, 0, 2);
      light.position.set(...pos);
      this.scene.add(light);
    }

    const bulb = new THREE.PointLight(0xF59C27, 200, 0, 2);
    bulb.position.set(0, 3, 0);
    this.scene.add(bulb);
  }

  // Private — each wall gets a fresh Mesh (different position/rotation) but
  // shares geometry and CANNON shape to minimise allocations.
  _createWall(x, y, z, rotationY, textureUrl) {
    // Load via the cache in assetloader — repeated calls for same URL return
    // the same texture object, so no duplicate GPU uploads.
    const tex = loader.load(textureUrl);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter  = THREE.NearestFilter;

    const mesh = new THREE.Mesh(
      this._wallGeometry,  // shared
      new THREE.MeshPhongMaterial({ map: tex, side: THREE.DoubleSide }),
    );
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotationY;
    this.scene.add(mesh);

    const body = new CANNON.Body({ mass: 0, shape: this._wallShape }); // shared shape
    body.position.set(x, y, z);
    body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotationY);
    this.world.addBody(body);
  }
}
