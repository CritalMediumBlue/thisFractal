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
    }

    init(solver) {
        this.branches = [];
        this.totalLengthOfHyphae = 0;
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
            Constants.TIPOC_SPLITTING_SIZE * 0.95,
            4
        );

        const segments = [Spore];

        Spore.branchHash = this._generateBranchHash(Spore.x, Spore.y, Spore.direction, Spore.availableMacromolecules, Spore.tipocSize, Spore.ATPConcentration);
        this.branches.push(Spore.branchHash);

        let newX = Spore.x + Math.cos(Spore.direction - Math.PI) * Constants.SEGMENT_SPACING;
        let newY = Spore.y + Math.sin(Spore.direction - Math.PI) * Constants.SEGMENT_SPACING;

        this._addNewCytoplasmSegment(
            newX,
            newY,
            Math.PI,
            Spore,
            segments,
            Constants.TIPOC_SPLITTING_SIZE * 0.95,
            4
        );

        // Initial concentrations are set via the segment constructor (macmol=4)
        // The solver reads from segments at the start of each step()

        Spore.distanceFromTheTip = Constants.SEGMENT_SPACING;

        this.lengthOfFirstBranch = 2;

        return segments;
    }

    _addNewCytoplasmSegment(x, y, direction, lastSegment, segments, tipocsize, macmol) {
        let newIndex = lastSegment.index + 1;
        this.totalLengthOfHyphae += Constants.SEGMENT_SPACING;

        const newSegment = new CytoplasmSegment(x, y, direction, newIndex, 0, tipocsize, macmol);
        segments.push(newSegment);
        const hash = lastSegment.branchHash;
        newSegment.branchHash = hash;
        if (hash === this.branches[0]) {
            this.lengthOfFirstBranch++;
        }

        lastSegment.addNeighbor(newSegment);
        newSegment.addNeighbor(lastSegment);
    }

    updateCytoplasmSegments(brownianParticles, particleManager, numberOfCytoplasmSegments, physicsWorld) {
        this.cytoplasmSegments.forEach(lastPoint => {
            if (lastPoint.tipocSize > Constants.TIPOC_SPLITTING_SIZE / 2 && lastPoint.finishedCell > Constants.MACROMOLECULES_REQUIRED_FOR_ELONGATION) {
                // Stretching mechanism at the tip
                brownianParticles.forEach(particle => {
                    const segment = particle.previousSegment;
                    const disp = Constants.DISPLACEMENT;
                    const displacement = (1 / ((segment.distanceFromTheTip / disp) + 1)) * (Constants.SEGMENT_SPACING);

                    if (segment.originalBranchHash === lastPoint.branchHash) {
                        particle.x += Math.cos(segment.originalDirection) * displacement;
                        particle.y += Math.sin(segment.originalDirection) * displacement;
                    } else if (segment.branchHash === lastPoint.branchHash) {
                        particle.x += Math.cos(segment.direction) * displacement;
                        particle.y += Math.sin(segment.direction) * displacement;
                    }

                    // Clamp particle back inside its closest segment after tip displacement
                    const dxTip = particle.x - segment.x;
                    const dyTip = particle.y - segment.y;
                    const distSqTip = dxTip * dxTip + dyTip * dyTip;
                    const limitTip = Constants.INT_CYTOPLASM_RADIUS;
                    if (distSqTip > limitTip * limitTip) {
                        const scaleTip = limitTip / Math.sqrt(distSqTip);
                        particle.x = segment.x + dxTip * scaleTip;
                        particle.y = segment.y + dyTip * scaleTip;
                    }

                    // Sync displaced position to Rapier body
                    physicsWorld.syncPosition(particle);
                });

                this.cytoplasmSegments.forEach(point => {
                    if (point.branchHash === lastPoint.branchHash) {
                        point.distanceFromTheTip += Constants.SEGMENT_SPACING;
                    }
                });
                this._elongateCytoplasm(lastPoint, particleManager, numberOfCytoplasmSegments);
            }

            if (lastPoint.tipocSize > 0 && lastPoint.tipocSize < Constants.TIPOC_SPLITTING_SIZE) {
                lastPoint.tipocSize += Constants.TIPOC_GROWTH_RATE * lastPoint.availableMacromolecules;
            }
        });
    }

    _elongateCytoplasm(lastPoint, particleManager, numberOfCytoplasmSegments) {
        const [newX, newY] = [
            lastPoint.x + Math.cos(lastPoint.direction) * Constants.SEGMENT_SPACING,
            lastPoint.y + Math.sin(lastPoint.direction) * Constants.SEGMENT_SPACING
        ];
        const newDirection = lastPoint.direction + (Math.random() - 0.5) * Constants.CURVINESS;
        if (lastPoint.tipocSize >= Constants.TIPOC_SPLITTING_SIZE) {
            const newTipoCSize = lastPoint.tipocSize * (0.5 + Math.random() / 2);
            lastPoint.tipocSize = lastPoint.tipocSize - newTipoCSize;
            lastPoint.originalDirection = newDirection;
            lastPoint.direction = Math.random() < 0.5 ? newDirection + Math.PI / 2 : lastPoint.direction - Math.PI / 2;
            this._addNewCytoplasmSegment(newX, newY, newDirection, lastPoint, this.cytoplasmSegments, newTipoCSize, 0);
            const branchHash = this._generateBranchHash();
            const originalBranchHash = lastPoint.branchHash;
            lastPoint.originalBranchHash = originalBranchHash;
            lastPoint.branchHash = branchHash;
            this.branches.push(branchHash);
        } else {
            this._addNewCytoplasmSegment(newX, newY, newDirection, lastPoint, this.cytoplasmSegments, lastPoint.tipocSize, 0);
            lastPoint.tipocSize = 0;
        }

        if (lastPoint.index % Constants.ADD_FOCI_EVERY === 0) {
            particleManager.addNewBrownianParticle(this.cytoplasmSegments, numberOfCytoplasmSegments, lastPoint);
        }
    }



    _generateBranchHash() {

        this.numberOfBranches++;
        return this.numberOfBranches;
    }
}
