import * as THREE from 'three';
import * as CANNON from 'cannon';
import { faceTex, sideTex } from './assetloader.js';
import { jumpVelocity, maxSpeed } from './variables.js';

export class Player {
  constructor(world, scene, position = { x: 0, y: 3, z: 0.001 }) {
    this.world = world;
    this.scene = scene;
    this.canJump = false;
    this.isCrouching = false;

    // ── Physics body ──────────────────────────────────────────────────────
    this.body = new CANNON.Body({
      mass: 60,
      shape: new CANNON.Box(new CANNON.Vec3(0.25, 0.75, 0.25)),
      fixedRotation: true,
      position: new CANNON.Vec3(position.x, position.y, position.z)
    });
    this.world.addBody(this.body);

    // ── Mesh ──────────────────────────────────────────────────────────────
    [faceTex, sideTex].forEach(t => {
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
    });

    this.materials = [
      new THREE.MeshPhongMaterial({ map: sideTex }),
      new THREE.MeshPhongMaterial({ map: sideTex }),
      new THREE.MeshPhongMaterial({ map: sideTex }),
      new THREE.MeshPhongMaterial({ map: sideTex }),
      new THREE.MeshPhongMaterial({ map: faceTex }),
      new THREE.MeshPhongMaterial({ map: sideTex }),
    ];

    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 1.5, 0.5),
      this.materials
    );
    this.scene.add(this.mesh);

    // ── Jump collision listener ───────────────────────────────────────────
    const upAxis = new CANNON.Vec3(0, 1, 0);
    this.body.addEventListener('collide', event => {
      const contact = event.contact;
      const contactNormal = new CANNON.Vec3();
      if (contact.bi.id === this.body.id) contact.ni.negate(contactNormal);
      else contactNormal.copy(contact.ni);
      if (contactNormal.dot(upAxis) > 0.5) this.canJump = true;
    });
  }

  crouch() {
    if (this.isCrouching) return;
    this.isCrouching = true;
    this.body.shapes[0] = new CANNON.Box(new CANNON.Vec3(0.25, 0.4, 0.25));
    this.body.position.y -= 0.375;
    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.BoxGeometry(0.5, 0.75, 0.5);
  }

  uncrouch() {
    if (!this.isCrouching) return;
    this.isCrouching = false;
    this.body.shapes[0] = new CANNON.Box(new CANNON.Vec3(0.25, 0.75, 0.25));
    this.body.position.y += 0.375;
    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.BoxGeometry(0.5, 1.5, 0.5);
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
    this.mesh.rotation.y = yaw;
  }

  get position() {
    return this.body.position;
  }

  get eyeHeight() {
    return this.isCrouching ? 0.1 : 0.5;
  }
}
