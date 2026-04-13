import { Constants } from './constants.js';

export class CytoplasmSegment {
    constructor(x, y, direction, index, atpConcentration, tipocSize=INITIAL_FOCI_SIZE, availableMacromolecules) {
        this.x = x;
        this.y = y;
        this.direction = direction; // Angle in radians. Tells the direction in which the segment is growing, or the direction of the cytoplasmic stretching
        this.ATPConcentration = atpConcentration;
        this.neighbors = []; // Array of neighboring segments that are connected to this segment. This is used in the diffusion simulation. The velocity at which a metabolite  (either macromolecules or ATP)diffuses is proportional to the concentration of the metabolite in the neighboring segments
        this.index = index; // Index of the segment in the hyphae. This is used to calculate the distance from the spore to the tip of the hyphae.
        this.closestFoci = [];
        this.consumptionOfATP = 0;
        this.branchHash = null; // This is used to identify the branch that the segment belongs to. 
        this.distanceFromTheTip = 0; // This is the distance from the tip of the hyphae to the segment. 
        this.consumptionOfATPInOneSecond = 0; 
        this.consumtionOfMacromoleculesInOneSecond = 0;
        this.productionOfMacromoleculesInOneSecond = 0;
        this.productionOfATPInOneSecond = 0;
        this.tipocSize = tipocSize;
        this.availableMacromolecules = availableMacromolecules; 
        this.finishedCell=0; 
        this.neighborIndices = [];
        this.arrayIndex = 0;
        this.consumptionOfMacromoleculesInOneSecond = 0;
      
    }

    addNeighbor(segment) {
        if (!this.neighbors.includes(segment)) {
            this.neighbors.push(segment);
        }
    }



    resetClosestBrownianParticles() {
        this.closestFoci = [];
    }

    draw() {
        // Rendering is now handled centrally via InstancedMesh in Simulation.draw()
    }
}