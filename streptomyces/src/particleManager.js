import { Constants } from './constants.js';
import { BrownianParticle } from './brownianParticle.js';
import { Quadtree } from './quadtree.js';

export class ParticleManager {
    constructor(physicsWorld) {
        this.brownianParticles = [];
        this.quadtreeCytoplasmSegments = null;
        this.physicsWorld = physicsWorld;
    }

    init(cytoplasmSegments) {
        const lastSegment = cytoplasmSegments[cytoplasmSegments.length - 2];
        const initialParticle = new BrownianParticle(lastSegment.x, lastSegment.y, lastSegment, false, Constants.MAX_FOCI_SIZE / 2);
        this.brownianParticles = [initialParticle];
        this.physicsWorld.addParticle(initialParticle);
        this.quadtreeCytoplasmSegments = Quadtree.create(cytoplasmSegments);
    }

    updateQuadtrees(cytoplasmSegments) {
        this.quadtreeCytoplasmSegments = Quadtree.create(cytoplasmSegments);
    }

    resetClosestParticles(cytoplasmSegments) {
        cytoplasmSegments.forEach(point => {
            point.resetClosestBrownianParticles();
        });
    }

    updateBrownianParticles(time) {
        // 1. Apply Brownian impulses to each particle's Rapier body
        this.brownianParticles.forEach(particle => {
            const closestCytoplasmSegment = this.findClosestCytoplasmSegment(particle);
            particle.applyBrownianImpulse(closestCytoplasmSegment, this.physicsWorld);
        });

        // 2. Step the Rapier physics world (resolves collisions)
        this.physicsWorld.step();

        // 3. Read back positions, apply boundary clamping, record traces, grow size
        this.brownianParticles.forEach(particle => {
            const pos = this.physicsWorld.readPosition(particle);
            if (pos) {
                particle.x = pos.x;
                particle.y = pos.y;
            }

            const closestCytoplasmSegment = particle.previousSegment;
            particle.clampToBoundary(closestCytoplasmSegment);
            particle.updateTraceAndGrowth(time);
        });

        // 4. Manually resolve any remaining overlaps after clamping
        const minDist = Constants.FOCUS_RADIUS * 2; // two radii = touching
        const minDistSq = minDist * minDist;
        const particles = this.brownianParticles;
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[j].x - particles[i].x;
                const dy = particles[j].y - particles[i].y;
                const distSq = dx * dx + dy * dy;
                if (distSq < minDistSq && distSq > 0) {
                    const dist = Math.sqrt(distSq);
                    const overlap = minDist - dist;
                    const nx = dx / dist;
                    const ny = dy / dist;
                    // Push each particle half the overlap distance
                    particles[i].x -= nx * overlap * 0.5;
                    particles[i].y -= ny * overlap * 0.5;
                    particles[j].x += nx * overlap * 0.5;
                    particles[j].y += ny * overlap * 0.5;
                }
            }
        }

        // 5. Sync all final positions to Rapier
        this.brownianParticles.forEach(particle => {
            this.physicsWorld.syncPosition(particle);
        });
    }

    findClosestCytoplasmSegment(particle) {
        let minDistance = Constants.CYTOPLASM_RADIUS * 4;
        let minDistanceSquared = minDistance * minDistance;
        let closestCytoplasmSegment = particle.previousSegment;
        const neighbors = closestCytoplasmSegment.neighbors;

        let [minX, maxX, minY, maxY] = [
            particle.x - minDistance,
            particle.x + minDistance,
            particle.y - minDistance,
            particle.y + minDistance
        ];

        this.quadtreeCytoplasmSegments.visit((node, x1, y1, x2, y2) => {
            if (!node.length) {
                const d = node.data;
                const [dx, dy] = [particle.x - d.x, particle.y - d.y];
                const distanceSquared = dx * dx + dy * dy;

                if (distanceSquared < minDistanceSquared) {
                    if (neighbors.includes(d) || d === particle.previousSegment) {
                        minDistanceSquared = distanceSquared;
                        minDistance = Math.sqrt(distanceSquared);
                        closestCytoplasmSegment = d;

                        [minX, maxX, minY, maxY] = [
                            particle.x - minDistance,
                            particle.x + minDistance,
                            particle.y - minDistance,
                            particle.y + minDistance
                        ];
                    }
                }
            }
            return x1 > maxX || x2 < minX || y1 > maxY || y2 < minY;
        });
        particle.previousSegment = closestCytoplasmSegment;
        closestCytoplasmSegment.closestFoci.push(particle);

        return closestCytoplasmSegment;
    }

    addNewBrownianParticle(cytoplasmSegments, numberOfCytoplasmSegments, lastSegment) {
        const branchHash = lastSegment.branchHash;

        let randomSegment = cytoplasmSegments[Math.floor(Math.random() * numberOfCytoplasmSegments)];
        while (randomSegment.branchHash !== branchHash || randomSegment.distanceFromTheTip >= 4) {
            randomSegment = cytoplasmSegments[Math.floor(Math.random() * numberOfCytoplasmSegments)];
        }

        const newX = randomSegment.x;
        const newY = randomSegment.y;

        const newParticle = new BrownianParticle(
            newX,
            newY,
            randomSegment,
            (this.brownianParticles.length) % Constants.TRACE_EVERY_NTH_PARTICLE === 0,
            Constants.INIT_FOCI_SIZE
        );

        this.brownianParticles.push(newParticle);
        this.physicsWorld.addParticle(newParticle);
    }
}
