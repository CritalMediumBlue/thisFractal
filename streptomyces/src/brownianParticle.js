import { Constants } from './constants.js';

export class BrownianParticle {
    constructor(x, y, previousSegment, isTraced, size) {
        this.x = x;
        this.y = y; 
        this.size = size;
        this.previousSegment = previousSegment;
        this.trace = [];
        this.isTraced = isTraced;
        this.color = 'rgb(10, 255, 10)';
        this.previousParticle = [];
    } 

    getNormalRandom() {
        let u = 0, v = 0;
        while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
        while(v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    updatePosition(closestCytoplasmSegment, closestBrownianParticle, time) {
      
        const limit = Constants.INT_CYTOPLASM_RADIUS ;
        const limitSquered = limit * limit;
        const Df = (1/(closestCytoplasmSegment.tipocSize*300+1)); //TIPOC INFLUENCES DIFFUSION
        //const Df = 1; //TIPOC DOES NOT INFLUENCE DIFFUSION
        const size_meters = this.size*(1/1e6); //from micrometers to meters
        const Do1 = Constants.Do/size_meters; // m^2/s
        const Do = Do1*(1e6/1)**2; // micrometers^2/s
        const normalDiffusionCoef = Do*Df; // µm^2/s

        const [dx2, dy2] = [closestBrownianParticle.x - this.x, closestBrownianParticle.y - this.y];
        const distanceSquered2 = (dx2 * dx2 + dy2 * dy2);
        const minDistance = Constants.FOCUS_RADIUS*6; // Minimum allowed distance between particles. This is set to 6 times the radius of the foci, so that they do not overlap too much. The factor of 6 is arbitrary and can be adjusted based on the desired level of overlap.
        const minDistanceSquared = minDistance*minDistance;

        this.x += (Math.sqrt(normalDiffusionCoef*2*5) * this.getNormalRandom())*(10/1); //5 seconds. The 10 is to convert the micrometers to pixels
        this.y += (Math.sqrt(normalDiffusionCoef*2*5) * this.getNormalRandom())*(10/1);

        //console.log("Closest brownian particle:", closestBrownianParticle.x, closestBrownianParticle.y, "Distance squared:", distanceSquered2);
        if (distanceSquered2 < minDistanceSquared) { //push them apart if they are too close
            //console.log("Pushing particles apart");
            const distance2 = Math.sqrt(distanceSquered2);
            const overlap = minDistance - distance2;
            const angle2 = Math.atan2(dy2, dx2);
            const pushX = overlap * Math.cos(angle2);
            const pushY = overlap * Math.sin(angle2);

            this.x -= pushX/2; // Move this particle away from the closest particle
            this.y -= pushY/2;
            closestBrownianParticle.x += pushX/4; // Move the closest particle away from this particle
            closestBrownianParticle.y += pushY/4;
          
        }


       
        this.x += (Math.sqrt(normalDiffusionCoef*2*5) * this.getNormalRandom())*(10/1); //5 seconds. The 10 is to convert the micrometers to pixels
        this.y += (Math.sqrt(normalDiffusionCoef*2*5) * this.getNormalRandom())*(10/1);


        const [dx, dy] = [closestCytoplasmSegment.x - this.x, closestCytoplasmSegment.y - this.y];
        const distanceSquered = (dx * dx + dy * dy);
        //Return it to the boundary if it goes outside
        if (distanceSquered > limitSquered) {
            const distance = Math.sqrt(distanceSquered);
            const angle = Math.atan2(-dy, -dx);
            const newRelativeX = (2*limit-distance) * Math.cos(angle);
            const newRelativeY = (2*limit-distance) * Math.sin(angle);

            this.x = closestCytoplasmSegment.x + newRelativeX;
            this.y = closestCytoplasmSegment.y + newRelativeY;
        } 

    

        
        
        if (this.isTraced && time % 600 === 0) { //
            

            this.trace.push({x: this.x, y: this.y});
            if (this.trace.length > Constants.MAX_TRACE_LENGTH) {
                this.trace = this.trace.slice(500);
            } 
            //console.log(this.trace.length);
        }

        if(this.size < Constants.MAX_FOCI_SIZE) {
            this.size += 0.001*this.previousSegment.availableMacromolecules;
             if(this.size >= Constants.MAX_FOCI_SIZE) {  
           // console.log(this.size);
            this.size = Constants.MAX_FOCI_SIZE;
            } 
        }


    }
  
    

    draw() {
        // Rendering is now handled centrally via InstancedMesh in Simulation.draw()
    }
}