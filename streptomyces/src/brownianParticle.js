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

    updatePosition(closestCytoplasmSegment,time) {
      
        const limit = Constants.CYTOPLASM_RADIUS ;
        const limitSquered = limit * limit;
        //const Df = (1/(closestCytoplasmSegment.tipocSize*20+1)); //TIPOC INFLUENCES DIFFUSION
        const Df = 1; //TIPOC DOES NOT INFLUENCE DIFFUSION
        const size_meters = this.size*(1/1e6); //from micrometers to meters
        const Do1 = Constants.Do/size_meters; // m^2/s
        const Do = Do1*(1e6/1)**2; // micrometers^2/s
        const normalDiffusionCoef = Do*Df; // µm^2/s

       
        this.x += (Math.sqrt(normalDiffusionCoef*2*5) * this.getNormalRandom())*(10/1); //5 seconds. The 10 is to convert the micrometers to pixels
        this.y += (Math.sqrt(normalDiffusionCoef*2*5) * this.getNormalRandom())*(10/1);
        const [dx, dy] = [closestCytoplasmSegment.x - this.x, closestCytoplasmSegment.y - this.y];
        const distanceSquered = (dx * dx + dy * dy);
        //Return it to the boundary if it goes outside
        if (distanceSquered > limitSquered) {
            const distance = Math.sqrt(distanceSquered);
            const difference = distance - limit;
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
  
    

    draw(ctx, shift) {
        const Factor = 1.5;

        if( Factor*this.x > 0 && Factor*this.y > 0 && Factor*this.x < Constants.CANVAS_WIDTH/3 && Factor*this.y < Constants.CANVAS_HEIGHT){

        const size = (0.5)*Constants.MICROMETER_TO_PIXEL;
        ctx.fillStyle = 'rgba(0, 100, 0, 1)';
        //ctx.strokeStyle =  'rgb(0, 0, 0)';
        //ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.arc(Factor*this.x + shift, Factor*this.y, size, 0, 2 * Math.PI);
        ctx.fill();
        //ctx.stroke();
        ctx.closePath();
        ctx.beginPath();
        ctx.fillStyle = 'rgb(150, 255, 150)';
        ctx.arc(Factor*this.x + shift, Factor*this.y, size/2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.closePath();

        if (this.isTraced && this.trace.length > 1 && Constants.addtrace) {
            ctx.strokeStyle = 'rgba(150, 255, 150)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(this.trace[0].x*Factor + shift, this.trace[0].y*Factor);
            for (let i = 0; i < this.trace.length; i ++) {
                ctx.lineTo(this.trace[i].x*Factor + shift, this.trace[i].y*Factor);
            }
            ctx.stroke();
        }
    }
    }
}