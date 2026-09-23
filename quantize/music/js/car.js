import * as THREE from 'three';
import * as CANNON from 'cannon';
import { faceTex, sideTex } from './assetloader.js';
import { jumpVelocity, maxSpeed } from './variables.js';

export class Vehicle {
  constructor(world, scene, position = { x: 15, y: 3, z: 0.001 }) {
    this.world = world;
    this.scene = scene;

    // ── Physics body ──────────────────────────────────────────────────────
    this.body = new CANNON.Body({
      mass: 60,
      shape: new CANNON.Box(new CANNON.Vec3(0.6, 0.1, 1.0)),
      fixedRotation: true,
      position: new CANNON.Vec3(position.x, position.y, position.z)
    });
    this.world.addBody(this.body);

    // ── Materials ─────────────────────────────────────────────────────────
    [faceTex, sideTex].forEach(t => {
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
    });

    const deckMat = new THREE.MeshPhongMaterial({ map: sideTex });
    const wheelMat = new THREE.MeshPhongMaterial({ color: 0x222222 });

    // ── Deck mesh ─────────────────────────────────────────────────────────
    this.mesh = new THREE.Group();

    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.15, 2.0),
      deckMat
    );
    deck.position.set(0, 0, 0);
    this.mesh.add(deck);

    // ── Wheels ────────────────────────────────────────────────────────────
    // CylinderGeometry(radiusTop, radiusBottom, height, segments)
    const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.15, 12);
    // rotate so the cylinder rolls along Z
    wheelGeo.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI / 2));

    const wheelPositions = [
      { x:  0.65, y: -0.15, z:  0.7 },
      { x: -0.65, y: -0.15, z:  0.7 },
      { x:  0.65, y: -0.15, z: -0.7 },
      { x: -0.65, y: -0.15, z: -0.7 },
    ];

    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(pos.x, pos.y, pos.z);
      this.mesh.add(wheel);
    });

    this.scene.add(this.mesh);

    // ── Ground check ──────────────────────────────────────────────────────
    this.canJump = false;
    const upAxis = new CANNON.Vec3(0, 1, 0);
    this.body.addEventListener('collide', event => {
      const contact = event.contact;
      const contactNormal = new CANNON.Vec3();
      if (contact.bi.id === this.body.id) contact.ni.negate(contactNormal);
      else contactNormal.copy(contact.ni);
      if (contactNormal.dot(upAxis) > 0.5) this.canJump = true;
    });
  }

  update(input, yaw, wantsJump) {
    // ── Movement ──────────────────────────────────────────────────────────
    if (input.lengthSq() > 0) {
      input.normalize();
      this.body.velocity.x = input.x * maxSpeed;
      this.body.velocity.z = input.z * maxSpeed;
    } else {
      this.body.velocity.x = 0;
      this.body.velocity.z = 0;
    }

    this.body.linearDamping = 0;

    // ── Jump ──────────────────────────────────────────────────────────────
    if (wantsJump && this.canJump) {
      this.body.velocity.y = jumpVelocity;
      this.canJump = false;
    }

    // ── Sync mesh ─────────────────────────────────────────────────────────
    this.mesh.position.copy(this.body.position);
    // this.mesh.rotation.y = yaw;
  }

  get position() {
    return this.body.position;
  }
}
