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
        const minDistance = Constants.FOCUS_RADIUS*4; // Minimum allowed distance between particles. This is set to 8 times the radius of the foci, so that they do not overlap too much. The factor of 8 is arbitrary and can be adjusted based on the desired level of overlap.
        const minDistanceSquared = minDistance*minDistance;

        this.x += (Math.sqrt(normalDiffusionCoef*2*5) * this.getNormalRandom())*(10/1); //5 seconds. The 10 is to convert the micrometers to pixels
        this.y += (Math.sqrt(normalDiffusionCoef*2*5) * this.getNormalRandom())*(10/1);

        //console.log("Closest brownian particle:", closestBrownianParticle.x, closestBrownianParticle.y, "Distance squared:", distanceSquered2);
        if (distanceSquered2 < minDistanceSquared) { //push them apart if they are too close
            //console.log("Pushing particles apart");
            const distance2 = Math.sqrt(distanceSquered2);
            const overlap = minDistance - distance2;
            const maxPush = limit*0.5 ; // Cap push to half the confinement radius
            const cappedOverlap = Math.min(overlap, maxPush);
            const angle2 = Math.atan2(dy2, dx2);
            const pushX = cappedOverlap * Math.cos(angle2);
            const pushY = cappedOverlap * Math.sin(angle2);

            this.x -= pushX; // Move only this particle by the capped overlap
            this.y -= pushY;
          
        }


       
        this.x += (Math.sqrt(normalDiffusionCoef*2*5) * this.getNormalRandom())*(10/1); //5 seconds. The 10 is to convert the micrometers to pixels
        this.y += (Math.sqrt(normalDiffusionCoef*2*5) * this.getNormalRandom())*(10/1);


        const [dx, dy] = [this.x - closestCytoplasmSegment.x, this.y - closestCytoplasmSegment.y];
        const distanceSquered = (dx * dx + dy * dy);
        //Clamp to boundary if it goes outside
        if (distanceSquered > limitSquered) {
            const scale = limit / Math.sqrt(distanceSquered);
            this.x = closestCytoplasmSegment.x + dx * scale;
            this.y = closestCytoplasmSegment.y + dy * scale;
        } 

    

        
        
        if (this.isTraced && time % 600 === 0) { //
            

            this.trace.push({x: this.x, y: this.y, time: time});
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