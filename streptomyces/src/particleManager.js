import { Constants } from './constants.js';
import { BrownianParticle } from './brownianParticle.js';
import { Quadtree } from './quadtree.js';

export class ParticleManager {
    constructor() {
        this.brownianParticles = [];
        this.quadtreeBrownianParticles = null;
        this.quadtreeCytoplasmSegments = null;
    }

    init(cytoplasmSegments) {
        const lastSegment = cytoplasmSegments[cytoplasmSegments.length - 2];
        this.brownianParticles = [new BrownianParticle(lastSegment.x, lastSegment.y, lastSegment, false, Constants.MAX_FOCI_SIZE / 2)];
        this.quadtreeBrownianParticles = Quadtree.create(this.brownianParticles);
        this.quadtreeCytoplasmSegments = Quadtree.create(cytoplasmSegments);
    }

    updateQuadtrees(cytoplasmSegments) {
        this.quadtreeBrownianParticles = Quadtree.create(this.brownianParticles);
        this.quadtreeCytoplasmSegments = Quadtree.create(cytoplasmSegments);
    }

    resetClosestParticles(cytoplasmSegments) {
        cytoplasmSegments.forEach(point => {
            point.resetClosestBrownianParticles();
        });
    }

    updateBrownianParticles(time) {
        this.brownianParticles.forEach(particle => {
            const closestCytoplasmSegment = this.findClosestCytoplasmSegment(particle);
            const closestBrownianParticle = this.findClosestBrownianParticle(particle);
            particle.updatePosition(closestCytoplasmSegment, closestBrownianParticle, time);
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

    findClosestBrownianParticle(particle) {
        let minDistance = Constants.CYTOPLASM_RADIUS * 4;
        let minDistanceSquared = minDistance * minDistance;
        let closestBrownianParticle = particle.previousParticle;

        let [minX, maxX, minY, maxY] = [
            particle.x - minDistance,
            particle.x + minDistance,
            particle.y - minDistance,
            particle.y + minDistance
        ];

        this.quadtreeBrownianParticles.visit((node, x1, y1, x2, y2) => {
            if (!node.length) {
                const d = node.data;
                const [dx, dy] = [particle.x - d.x, particle.y - d.y];
                const distanceSquared = dx * dx + dy * dy;
                const dHash = d.previousSegment.branchHash;
                const pHash = particle.previousSegment.branchHash;
                if (distanceSquared < minDistanceSquared && d !== particle && dHash === pHash) {
                    minDistanceSquared = distanceSquared;
                    minDistance = Math.sqrt(distanceSquared);
                    closestBrownianParticle = d;
                    [minX, maxX, minY, maxY] = [
                        particle.x - minDistance,
                        particle.x + minDistance,
                        particle.y - minDistance,
                        particle.y + minDistance
                    ];
                }
            }
            return x1 > maxX || x2 < minX || y1 > maxY || y2 < minY;
        });
        particle.previousParticle = closestBrownianParticle;

        return closestBrownianParticle;
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
    }
}
