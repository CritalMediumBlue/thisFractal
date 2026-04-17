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
        const gravity = { x: 0.0, y: 0.0 };
        this.world = new RAPIER.World(gravity);
        // More aggressive solver for faster penetration resolution
        this.world.integrationParameters.numSolverIterations = 20;
        this.world.integrationParameters.numAdditionalFrictionIterations = 0;
    }

    addParticle(particle) {
        const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(particle.x, particle.y)
            .setGravityScale(0.0)
            .setLinearDamping(0.0)
            .setCcdEnabled(true)
            .setCanSleep(false);
        const rigidBody = this.world.createRigidBody(rigidBodyDesc);
        rigidBody.lockRotations(true, true);

        const colliderDesc = RAPIER.ColliderDesc.ball(Constants.FOCUS_RADIUS)
            .setRestitution(1)
            .setFriction(0.0)
            .setMass(2);
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
        this.world.step();
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
