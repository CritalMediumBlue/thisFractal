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

    draw(canvas, shift) {
        const Factor = 1.5;
        if( this.x > 0 && Factor*this.y > 0 && Factor*this.x < Constants.CANVAS_WIDTH/3 && Factor*this.y < Constants.CANVAS_HEIGHT){
        if (shift === 0 ) {
            canvas.ctx.fillStyle = viridisScaleAge(this.availableMacromolecules);
            canvas.ctx.beginPath();
            canvas.ctx.arc(Factor*this.x + shift, Factor*this.y, Factor*Constants.CYTOPLASM_RADIUS, 0, 2 * Math.PI);
            canvas.ctx.fill();
            canvas.ctx.closePath();

        } else if (shift === Constants.CANVAS_WIDTH / 3) {
            canvas.ctx.fillStyle =  viridisScaleATP(this.ATPConcentration);
            canvas.ctx.beginPath();
            canvas.ctx.arc(Factor*this.x + shift, Factor*this.y, Factor*Constants.CYTOPLASM_RADIUS, 0, 2 * Math.PI);
            canvas.ctx.fill();
            canvas.ctx.closePath();

         } else {
            canvas.ctx.fillStyle =  viridisScaleConsumption(this.consumptionOfATPInOneSecond);
            canvas.ctx.beginPath();
            canvas.ctx.arc(Factor*this.x + shift, Factor*this.y, Factor*Constants.CYTOPLASM_RADIUS, 0, 2 * Math.PI);
            canvas.ctx.fill();
            canvas.ctx.closePath();
         }      
         
         if (this.tipocSize > 0) {
            canvas.ctx.fillStyle = 'rgb(255, 0, 255, 0.5)';
            canvas.ctx.strokeStyle = 'rgb(30, 0, 30)';
            canvas.ctx.lineWidth = 2;
            canvas.ctx.beginPath();
            canvas.ctx.arc(Factor*this.x + shift + Math.cos(this.direction)*Constants.CYTOPLASM_RADIUS, Factor*this.y +  Math.sin(this.direction)*Constants.CYTOPLASM_RADIUS, this.tipocSize*7, 0, 2 * Math.PI);
            canvas.ctx.fill();
            canvas.ctx.stroke();
            canvas.ctx.closePath();
            // write the size of the tipoc next to it
            //canvas.writeText(this.tipocSize.toFixed(2), this.x + shift +  Math.cos(this.direction)*Constants.TICK_LENGTH*2, this.y +  Math.sin(this.direction)*Constants.TICK_LENGTH*2+Constants.FONT_SIZE_SMALL/2.5, Constants.FONT_SIZE_SMALL, 'rgb(100, 0, 100, 1)', 'center');

        } 
    }

      
  
    }
}