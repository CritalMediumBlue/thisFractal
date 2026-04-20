import { Constants } from './constants.js';
import { CytoplasmSegment } from './cytoplasmSegment.js';

export class HyphaeGrowth {
    constructor() {
        this.branches = [];
        this.totalLengthOfHyphae = 0;
        this.lengthOfFirstBranch = 0;
        this.cytoplasmSegments = [];
        this.numberOfCytoplasmSegments = 0;
        this.numberOfBranches = 0;
        this.tipSegments = [];        // active tip segments (tipocSize > 0)
        this.branchSegments = new Map(); // branchId -> CytoplasmSegment[]
    }

    init(solver) {
        this.branches = [];
        this.totalLengthOfHyphae = 0;
        this.numberOfBranches = 0;
        this.lengthOfFirstBranch = 0;
        this.tipSegments = [];
        this.branchSegments = new Map();
        this.cytoplasmSegments = this._initializeCytoplasmSegments(solver);
        this.numberOfCytoplasmSegments = 0;
    }

    _initializeCytoplasmSegments(solver) {
        let Spore = new CytoplasmSegment(
            0,
            0,
            0,
            0,
            0,
            0,
            Constants.TIPOC_SPLITTING_SIZE * 0.95,
            4
        );

        const segments = [Spore];

        Spore.branchHash = this._nextBranchId();
        this.branches.push(Spore.branchHash);
        this.branchSegments.set(Spore.branchHash, [Spore]);
        this.tipSegments.push(Spore);
        Spore.distanceFromTheTip = Constants.SEGMENT_SPACING;

        // Add the other half of the spore, which grows in the opposite


/*         let newX = Spore.x + Math.cos(Spore.direction - Math.PI) * Constants.SEGMENT_SPACING;
        let newY = Spore.y + Math.sin(Spore.direction - Math.PI) * Constants.SEGMENT_SPACING;
        let newZ = Spore.z;

        this._addNewCytoplasmSegment(
            Spore.x,
            Spore.y,
            Spore.z,
            Math.PI,
            Spore,
            segments,
            Constants.TIPOC_SPLITTING_SIZE * 0.95,
            4
        );
 */
        // option 2 for adding the second half of the spore

    const otherSpore = new CytoplasmSegment(
            0,
            0,
            0,
            Math.PI,
            0,
            0,
            Constants.TIPOC_SPLITTING_SIZE * 0.95,
            4
        );
        segments.push(otherSpore);
        this.totalLengthOfHyphae += Constants.SEGMENT_SPACING; // ← this is what's missing
        otherSpore.branchHash = this._nextBranchId();
        this.branches.push(otherSpore.branchHash);
        this.branchSegments.set(otherSpore.branchHash, [otherSpore]);
        this.tipSegments.push(otherSpore);

        Spore.addNeighbor(otherSpore);
        otherSpore.addNeighbor(Spore);

        


        this.lengthOfFirstBranch = 2;

        return segments;
    }

    _addNewCytoplasmSegment(x, y, z, direction, lastSegment, segments, tipocsize, macmol, index) {
        let newIndex = index !== undefined ? index : lastSegment.index + 1;
        this.totalLengthOfHyphae += Constants.SEGMENT_SPACING;

        const newSegment = new CytoplasmSegment(x, y, z, direction, newIndex, 0, tipocsize, macmol);
        segments.push(newSegment);
        const hash = lastSegment.branchHash;
        newSegment.branchHash = hash;
        this.branchSegments.get(hash).push(newSegment);
        if (hash === this.branches[0]) {
            this.lengthOfFirstBranch++;
        }

        lastSegment.addNeighbor(newSegment);
        newSegment.addNeighbor(lastSegment);
        return newSegment;
    }

    updateCytoplasmSegments(brownianParticles, particleManager, numberOfCytoplasmSegments, physicsWorld) {
        // Snapshot tipSegments — _elongateCytoplasm modifies the array during iteration
        const currentTips = [...this.tipSegments];
        currentTips.forEach(cytoplasmSegment => {
            if (cytoplasmSegment.tipocSize > Constants.TIPOC_SPLITTING_SIZE / 2 && cytoplasmSegment.finishedCell > Constants.MACROMOLECULES_REQUIRED_FOR_ELONGATION) {
                // Stretching mechanism at the tip
                brownianParticles.forEach(particle => {
                    const segment = particle.previousSegment;

                    if (segment.branchHash === cytoplasmSegment.branchHash || segment.originalBranchHash === cytoplasmSegment.branchHash) {
                        const disp = Constants.DISPLACEMENT;
                        const displacement = (1 / (((segment.distanceFromTheTip) / disp) + 1)) * (Constants.SEGMENT_SPACING);

                        if (segment.originalBranchHash === cytoplasmSegment.branchHash) {
                            particle.x += Math.cos(segment.originalDirection) * displacement;
                            particle.y += Math.sin(segment.originalDirection) * displacement;
                        } else {
                            particle.x += Math.cos(segment.direction) * displacement;
                            particle.y += Math.sin(segment.direction) * displacement;
                        }

                        // Sync displaced position to Rapier body
                        physicsWorld.syncPosition(particle);
                    }
                });

                // Update distanceFromTheTip only for segments on this branch (O(branch length))
                const branchSegs = this.branchSegments.get(cytoplasmSegment.branchHash);
                if (branchSegs) {
                    branchSegs.forEach(point => { point.distanceFromTheTip += Constants.SEGMENT_SPACING; });
                }
                this._elongateCytoplasm(cytoplasmSegment, particleManager, numberOfCytoplasmSegments);
            }

            if (cytoplasmSegment.tipocSize > 0 && cytoplasmSegment.tipocSize < Constants.TIPOC_SPLITTING_SIZE) {
                cytoplasmSegment.tipocSize += Constants.TIPOC_GROWTH_RATE * cytoplasmSegment.availableMacromolecules;
            }
        });
    }

    _elongateCytoplasm(lastPoint, particleManager, numberOfCytoplasmSegments) {
        const [newX, newY, newZ] = [
            lastPoint.x + Math.cos(lastPoint.direction) * Constants.SEGMENT_SPACING,
            lastPoint.y + Math.sin(lastPoint.direction) * Constants.SEGMENT_SPACING,
            lastPoint.z
        ];
        let newSegment 
        const newDirection = lastPoint.direction + (Math.random() - 0.5) * Constants.CURVINESS;
        if (lastPoint.tipocSize >= Constants.TIPOC_SPLITTING_SIZE) {
            const newTipoCSize = lastPoint.tipocSize * (0.5 + Math.random() / 2);
            lastPoint.tipocSize = lastPoint.tipocSize - newTipoCSize;
            lastPoint.originalDirection = newDirection;
            lastPoint.direction = Math.random() < 0.5 ? newDirection + Math.PI / 2 : lastPoint.direction - Math.PI / 2;
            newSegment = this._addNewCytoplasmSegment(newX, newY, newZ, newDirection, lastPoint, this.cytoplasmSegments, newTipoCSize, 0);
            this.tipSegments.push(newSegment); // newSegment is the new continuation tip
            const branchHash = this._nextBranchId();
            const originalBranchHash = lastPoint.branchHash;
            lastPoint.originalBranchHash = originalBranchHash;
            lastPoint.branchHash = branchHash;
            this.branches.push(branchHash);
            // Move lastPoint from the continuation branch to the new lateral branch
            const origList = this.branchSegments.get(originalBranchHash);
            origList.splice(origList.indexOf(lastPoint), 1);
            this.branchSegments.set(branchHash, [lastPoint]);
        } else {
            newSegment = this._addNewCytoplasmSegment(newX, newY, newZ, newDirection, lastPoint, this.cytoplasmSegments, lastPoint.tipocSize, 0);
            lastPoint.tipocSize = 0;
            // Transfer tip ownership: lastPoint is no longer a tip, newSegment takes over
            this.tipSegments.splice(this.tipSegments.indexOf(lastPoint), 1);
            this.tipSegments.push(newSegment);
        }

        if (newSegment.index % Constants.ADD_FOCI_EVERY === 0) {
            particleManager.addNewBrownianParticle( newSegment);
        }
    }



    _nextBranchId() {
        this.numberOfBranches++;
        return this.numberOfBranches;
    }
}
