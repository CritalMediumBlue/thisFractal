import RAPIER from '@dimforge/rapier2d-compat';
import { Constants } from './constants.js';

export { RAPIER };

export class PhysicsWorld {
    constructor() {
        this.world = null;
        this.particleBodies = new Map();  // BrownianParticle -> RigidBody
        this.particleColliders = new Map(); // BrownianParticle -> Collider
    }

    init() {
        if (this.world) {
            this.world.free(); // release WASM-backed memory before replacing
        }
        this.particleBodies.clear();
        this.particleColliders.clear();

        const gravity = { x: 0.0, y: 0.0 };
        this.world = new RAPIER.World(gravity);
    }

    addParticle(particle) {
        const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(particle.x, particle.y)
            .setGravityScale(0.0)
            .setLinearDamping(0.0)
            .setCcdEnabled(false)
            .setCanSleep(false); // sleeping bodies stop responding to contacts — must stay awake
        const rigidBody = this.world.createRigidBody(rigidBodyDesc);
        rigidBody.lockRotations(true, true);

        const colliderDesc = RAPIER.ColliderDesc.ball(Constants.FOCUS_RADIUS*2)
            .setRestitution(1)
            .setFriction(0.0)
            .setMass(1);
        const collider = this.world.createCollider(colliderDesc, rigidBody);

        this.particleBodies.set(particle, rigidBody);
        this.particleColliders.set(particle, collider);
        return rigidBody;
    }

    setBrownianVelocity(particle, dx, dy) {
        const rigidBody = this.particleBodies.get(particle);
        if (rigidBody) {
            // Convert desired displacement to velocity: v = displacement / dt
            // Rapier default dt = 1/60s, so multiply by 60
            const dt = this.world.integrationParameters.dt;
            rigidBody.setLinvel({ x: dx / dt, y: dy / dt }, true);
        }
    }

    step() {
         for (let i = 0; i < 100; i++) { // substeps for more stable collisions
        this.world.step();
        } 
    }

    readPosition(particle) {
        const rigidBody = this.particleBodies.get(particle);
        if (rigidBody) {
            const pos = rigidBody.translation();
            return { x: pos.x, y: pos.y };
        }
        return null;
    }

    syncPosition(particle) {
        const rigidBody = this.particleBodies.get(particle);
        if (rigidBody) {
            rigidBody.setTranslation({ x: particle.x, y: particle.y }, true);
            rigidBody.setLinvel({ x: 0, y: 0 }, true);
        }
    }
}
