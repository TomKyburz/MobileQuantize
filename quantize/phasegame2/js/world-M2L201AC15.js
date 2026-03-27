import * as THREE from 'three';
import * as CANNON from 'cannon';
import { floor1, test, test1 } from '../js/assetloader.js';

// Tile index → texture
const TILE_TEXTURES = [floor1, test, test1];

function getTileTex(id) {
  return TILE_TEXTURES[id] ?? TILE_TEXTURES[0];
}

export class World {
  constructor() {
    this.scene = new THREE.Scene();
    this.world = new CANNON.World();
    this.world.gravity.set(0, -18, 0);
    this.world.defaultContactMaterial.friction    = 0;
    this.world.defaultContactMaterial.restitution = 0;
    this.initScene();
  }

  initScene() {
    const atmosphereColor = 0x0C001C;
    this.scene.background = new THREE.Color(atmosphereColor);
    this.scene.fog = new THREE.Fog(atmosphereColor, 1, 650);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    const positions = [[-25, 8, -25], [25, 8, 25], [25, 8, -25], [-25, 8, 25], [0, -1, 0]];
    positions.forEach(pos => {
      const light = new THREE.PointLight(0xF59C27, 400, 0, 2);
      light.position.set(...pos);
      this.scene.add(light);
    });
    const bulb = new THREE.PointLight(0xF59C27, 200, 0, 2);
    bulb.position.set(0, 3, 0);
    this.scene.add(bulb);

    // Load all surfaces from CSV — each resolves independently
    // Floor:   assets/map.csv   (XZ plane, y = 0)
    // Ceiling: assets/map1.csv  (XZ plane, y = WALL_HEIGHT)
    // Walls:   assets/map2.csv  (same CSV used for all 4 walls)
    // Box dimensions are derived from the floor CSV grid size.
    this._loadFloor('assets/map.csv');
    this._loadCeiling('assets/map1.csv');
    this._loadWalls('assets/map2.csv');
  }

  // ── Parse CSV helper ────────────────────────────────────────────────────────
  async _fetchGrid(csvPath) {
    const res  = await fetch(csvPath);
    const text = await res.text();
    return text.trim().split('\n').map(row =>
      row.trim().split(',').map(cell => parseInt(cell.trim(), 10))
    );
  }

  // ── Floor ───────────────────────────────────────────────────────────────────
  async _loadFloor(csvPath) {
    const grid = await this._fetchGrid(csvPath);
    const rows = grid.length;
    const cols = grid[0].length;
    const T    = 2; // tile size in world units

    const offsetX = -(cols * T) / 2 + T / 2;
    const offsetZ = -(rows * T) / 2 + T / 2;

    // Store dimensions so walls can use them
    this._floorCols = cols;
    this._floorRows = rows;
    this._tileSize  = T;

    const tileGeo = new THREE.BoxGeometry(T, 0.2, T);

    // Single flat physics body for the whole floor
    const floorBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3((cols * T) / 2, 0.1, (rows * T) / 2)),
    });
    floorBody.position.set(0, -0.1, 0);
    this.world.addBody(floorBody);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tex  = getTileTex(grid[r][c]);
        const mesh = new THREE.Mesh(tileGeo, new THREE.MeshPhongMaterial({ map: tex }));
        mesh.position.set(offsetX + c * T, -0.1, offsetZ + r * T);
        this.scene.add(mesh);
      }
    }
  }

  // ── Ceiling ─────────────────────────────────────────────────────────────────
  async _loadCeiling(csvPath) {
    const grid       = await this._fetchGrid(csvPath);
    const rows       = grid.length;
    const cols       = grid[0].length;
    const T          = 2;
    const WALL_H     = 20; // world units tall

    const offsetX = -(cols * T) / 2 + T / 2;
    const offsetZ = -(rows * T) / 2 + T / 2;

    const tileGeo = new THREE.BoxGeometry(T, 0.2, T);

    const ceilBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3((cols * T) / 2, 0.1, (rows * T) / 2)),
    });
    ceilBody.position.set(0, WALL_H + 0.1, 0);
    this.world.addBody(ceilBody);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tex  = getTileTex(grid[r][c]);
        const mesh = new THREE.Mesh(tileGeo, new THREE.MeshPhongMaterial({ map: tex }));
        mesh.position.set(offsetX + c * T, WALL_H + 0.1, offsetZ + r * T);
        this.scene.add(mesh);
      }
    }
  }

  // ── Walls ───────────────────────────────────────────────────────────────────
  // map2.csv is used for all 4 walls.
  // Rows = vertical (bottom→top), cols = horizontal (left→right along the wall).
  async _loadWalls(csvPath) {
    const grid = await this._fetchGrid(csvPath);
    const rows = grid.length;  // vertical tiles
    const cols = grid[0].length; // horizontal tiles
    const T    = 2;
    const WALL_H = 20;

    // Wait for floor to set dimensions, fallback to wall CSV cols if floor not ready
    const floorCols = this._floorCols ?? cols;
    const floorRows = this._floorRows ?? cols;
    const halfW = (floorCols * T) / 2;
    const halfD = (floorRows * T) / 2;

    const tileGeo = new THREE.BoxGeometry(T, T, 0.2);

    // Physics: one box per wall panel
    const wallShapeH = new CANNON.Box(new CANNON.Vec3(halfW, WALL_H / 2, 0.1));
    const wallShapeD = new CANNON.Box(new CANNON.Vec3(halfD, WALL_H / 2, 0.1));

    const wallDefs = [
      // [ normal direction, position, shapeToUse, rotationY ]
      { axis: 'z', sign:  1, pos: [0, WALL_H / 2,  halfD], shape: wallShapeH, ry: 0          },
      { axis: 'z', sign: -1, pos: [0, WALL_H / 2, -halfD], shape: wallShapeH, ry: Math.PI    },
      { axis: 'x', sign:  1, pos: [ halfW, WALL_H / 2, 0], shape: wallShapeD, ry: Math.PI / 2 },
      { axis: 'x', sign: -1, pos: [-halfW, WALL_H / 2, 0], shape: wallShapeD, ry: -Math.PI / 2 },
    ];

    for (const wall of wallDefs) {
      // Physics body
      const body = new CANNON.Body({ mass: 0, shape: wall.shape });
      body.position.set(...wall.pos);
      body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), wall.ry);
      this.world.addBody(body);

      // Visual tiles — place them in local space then rotate into position
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const tex  = getTileTex(grid[r][c]);
          const mesh = new THREE.Mesh(tileGeo, new THREE.MeshPhongMaterial({ map: tex, side: THREE.DoubleSide }));

          // Local position along the wall (c = horizontal, r = vertical from bottom)
          const localX = -((cols - 1) / 2) * T + c * T;
          const localY = T / 2 + r * T;

          // Rotate into world space based on which wall
          if (wall.axis === 'z') {
            mesh.position.set(
              wall.pos[0] + localX * (wall.sign),
              localY,
              wall.pos[2]
            );
            mesh.rotation.y = wall.ry;
          } else {
            mesh.position.set(
              wall.pos[0],
              localY,
              wall.pos[2] + localX * (wall.sign === 1 ? -1 : 1)
            );
            mesh.rotation.y = wall.ry;
          }

          this.scene.add(mesh);
        }
      }
    }
  }
}
