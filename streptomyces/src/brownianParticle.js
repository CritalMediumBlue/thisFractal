import { Constants } from './constants.js';

export class BrownianParticle {
    constructor(x, y, previousSegment, isTraced, size) {
        this.x = x;
        this.y = y; 
        this.size = size;
        this.previousSegment = previousSegment;
        this.trace = [];
        this.isTraced = isTraced;
    } 

    getNormalRandom() {
        let u = 0, v = 0;
        while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
        while(v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    applyBrownianImpulse(closestCytoplasmSegment, physicsWorld) {
        const Df = (1/(closestCytoplasmSegment.tipocSize*300+1)); //TIPOC INFLUENCES DIFFUSION
        const size_meters = this.size*(1/1e9); //from nanometers to meters
        const Do1 = Constants.Do/size_meters; // m^2/s
        const Do = Do1*(1e9)**2; // nm^2/s
        const normalDiffusionCoef = Do*Df; // nm^2/s

        // Two independent Brownian kicks (matching the original two displacement steps)
        const step = Math.sqrt(normalDiffusionCoef*2*5);
        const dx = (step * this.getNormalRandom() + step * this.getNormalRandom());
        const dy = (step * this.getNormalRandom() + step * this.getNormalRandom());

        // Set velocity so Rapier moves particle by (dx, dy) in one step
        physicsWorld.setBrownianVelocity(this, dx, dy);
    }

    clampToBoundary(closestCytoplasmSegment) {
        const limit = Constants.INT_CYTOPLASM_RADIUS;
        const limitSquared = limit * limit;

        const [dx, dy] = [this.x - closestCytoplasmSegment.x, this.y - closestCytoplasmSegment.y];
        const distanceSquared = (dx * dx + dy * dy);
        if (distanceSquared > limitSquared) {
            const scale = limit / Math.sqrt(distanceSquared);
            this.x = closestCytoplasmSegment.x + dx * scale;
            this.y = closestCytoplasmSegment.y + dy * scale;
        }
    }

    updateTraceAndGrowth(time) {
        if (this.isTraced && time % 600 === 0) {
            this.trace.push({x: this.x, y: this.y, time: time});
            if (this.trace.length > Constants.MAX_TRACE_LENGTH) {
                this.trace = this.trace.slice(500);
            }
        }

        if(this.size < Constants.MAX_FOCI_SIZE) {
            this.size += 0.001*this.previousSegment.availableMacromolecules;
            if(this.size >= Constants.MAX_FOCI_SIZE) {
                this.size = Constants.MAX_FOCI_SIZE;
            }
        }
    }
}