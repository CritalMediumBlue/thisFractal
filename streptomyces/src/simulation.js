import { Constants, Diffusion } from './constants.js';
import { Canvas } from './canvas.js';
import { CytoplasmSegment } from './cytoplasmSegment.js';
import { BrownianParticle } from './brownianParticle.js';
import { Quadtree } from './quadtree.js';
import { viridisScaleAge, viridisScaleATP, viridisScaleConsumption } from './colorScales.js';

export class Simulation {
    constructor() { 
        this.canvas = new Canvas();
        this.initializeProperties();
    }

    initializeProperties() {
        this.branches =[];
        this.totalLengthOfHyphae = 0;
        this.newConcentrations =  {
            availableMacromolecules: new Float64Array(Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS),
            ATPConcentration: new Float64Array(Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS)
        }
        this.cytoplasmSegments = this.initializeCytoplasmSegments();
        this.brownianParticles = this.initializeBrownianParticles();
        this.quadtreeBrownianParticles = Quadtree.create(this.brownianParticles);
        this.quadtreeCytoplasmSegments = Quadtree.create(this.cytoplasmSegments);
        this.iterations = Diffusion.numberOftimestepsPerSecond;

        this.totalATP1 = 0;
        this.totalATP2 = 0;

        this.totalMacromolecules1 = 0;
        this.totalMacromolecules2 = 8;

        this.totalATPConsumptionRate1 = 0;
        this.totalMacromoleculesConsumptionRate1 = 0;

        this.totalATPProductionRate1 = 0;

      
        this.time = 0;
        this.averageATPConcentration = 0;
        this.averageMacromolecules = 0;

        this.GrowthRateOfFirstBranch = 0;
        this.numberOfCytoplasmSegments = 0;
       
        this.history = {
            ATP: new Float32Array(Constants.MAX_TIME),
            averageATP:  new Float32Array(Constants.MAX_TIME),
            totalATPConsumptionRate: new Float32Array(Constants.MAX_TIME),
            lengthOfFirstBranch:  new Float32Array(Constants.MAX_TIME),
            GrowthRateOfFirstBranch: new Float32Array(Constants.MAX_TIME),
            MacromoleculesConsumptionRate:  new Float32Array(Constants.MAX_TIME),
            averageMacromolecules:  new Float32Array(Constants.MAX_TIME),
            totalLengthOfHyphae:  new Float32Array(Constants.MAX_TIME),
            numberOfBranches:  new Float32Array(Constants.MAX_TIME),
            numberOfFoci:  new Float32Array(Constants.MAX_TIME),
        }
  

        this.segmentToArrayIndex = new Map();

        this.oldConcentrations =  {
            availableMacromolecules: new Float64Array(Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS),
            ATPConcentration: new Float64Array(Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS)
        }
        
    

        this.sources = {
            ATPConcentration: new Float32Array(Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS),
            availableMacromolecules: new Float32Array(Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS)
        }

        this.sinks = {
            availableMacromolecules_S: new Float64Array(Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS),
            availableMacromolecules_M: new Float64Array(Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS),
            ATPConcentration_S: new Float64Array(Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS),
            ATPConcentration_M: new Float64Array(Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS)
        }
        this.finnishedCell = new Float64Array(Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS);
        this.consumtionOfMacromoleculesInOneSecond = new Float64Array(Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS);
        this.productionOfMacromoleculesInOneSecond = new Float64Array(Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS);
        this.consumtionOfATPInOneSecond = new Float64Array(Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS);
        this.productionOfATPInOneSecond = new Float64Array(Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS);
        this.numberOfNeighbors = new Int8Array(Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS);
        this.neighborIndices = new Int16Array(Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS*3); // the maximum number of neighbors is 3
        //console.log(this.iterations);


    }

    updateSegmentToArrayIndex() {
        const iterations = this.iterations;
        // Only update the existing map
        for (let i = 0; i < this.numberOfCytoplasmSegments; i++) {
            const segment = this.cytoplasmSegments[i];
            this.segmentToArrayIndex.set(segment, i);
        }

        // Calculate total average atp source first 
        /* let totalSource = 0;

        for (let i = 0; i < this.numberOfCytoplasmSegments; i++) {
            const segment = this.cytoplasmSegments[i];
            const numberOfFoci = segment.closestFoci.length;
            const foci = segment.closestFoci;
            if (numberOfFoci > 0) {

                for (let j = 0; j < numberOfFoci; j++) {
                    const focusj = foci[j];
                    totalSource += (Constants.ATP_PRODUCTION_RATE*(focusj.size)**2)*1212/iterations;
                }
            } 
        } */
        //const averageSource = totalSource / this.numberOfCytoplasmSegments;

        for (let i = 0; i < this.numberOfCytoplasmSegments; i++) {
            const segment = this.cytoplasmSegments[i];
            segment.neighborIndices = segment.neighbors.map(
                (neighbor) => this.segmentToArrayIndex.get(neighbor)
            );
            this.numberOfNeighbors[i] = segment.neighborIndices.length;
            this.neighborIndices[i*3] = segment.neighborIndices[0];
            this.neighborIndices[i*3+1] = segment.neighborIndices[1];
            this.neighborIndices[i*3+2] = segment.neighborIndices[2];

            const numberOfFoci = segment.closestFoci.length;
            const foci = segment.closestFoci;
             if (numberOfFoci > 0) { // Uncomment to localize ATP production
                let source = 0;

                for (let j = 0; j < numberOfFoci; j++) {
                    const focusj = foci[j];
                    source += (Constants.ATP_PRODUCTION_RATE*(focusj.size)**2)*1212/iterations;
                }
                this.sources.ATPConcentration[i] =  source;
               
               
            } else {
                this.sources.ATPConcentration[i] = 0;
            } 
            //this.sources.ATPConcentration[i] = averageSource;

            this.sinks.availableMacromolecules_S[i] = 2.5* (0.0000001*segment.tipocSize ) * (1212/iterations) 
            this.sinks.availableMacromolecules_M[i] = 2.5* 0.00000003 * (1212/iterations);
            this.sinks.ATPConcentration_S[i] = (0.4) * (0.004/((segment.distanceFromTheTip/Constants.DECAY)+1)) * (1212/iterations);
            this.sinks.ATPConcentration_M[i] = (0.4) * (0.0019) * (1212/iterations);

        }
    }

    getCanvas() {
        return this.canvas.canvas;
    }
    
    
        reactionDiffusion() {
                const numSegments = this.numberOfCytoplasmSegments;
                const numberOfNeighbors = this.numberOfNeighbors;
                const neighborIndices = this.neighborIndices;
                
        
                this.initializeoldConcentrations(numSegments);
    
                // Cache old and new concentrations 
                const newATP = this.newConcentrations.ATPConcentration;
                const oldATP = this.oldConcentrations.ATPConcentration;
                const newMacMol = this.newConcentrations.availableMacromolecules;
                const oldMacMol = this.oldConcentrations.availableMacromolecules;
                const souATP = this.sources.ATPConcentration;
                const sinATPS = this.sinks.ATPConcentration_S;
                const sinATPM = this.sinks.ATPConcentration_M;
                const sinMacMolS = this.sinks.availableMacromolecules_S;
                const sinMacMolM = this.sinks.availableMacromolecules_M;
                const segments = this.cytoplasmSegments;
                const finCell = this.finnishedCell;
                const consATPSec = this.consumtionOfATPInOneSecond;
                const prodATPSec = this.productionOfATPInOneSecond;
                const consMacMolSec = this.consumtionOfMacromoleculesInOneSecond;
                const prodMacMolSec = this.productionOfMacromoleculesInOneSecond;
                const ATPtoMacMol = Constants.ATP_TO_MACROMOLECULES;
                let totalATP2 = 0;
                let totalMacromolecules2 = 0;
                let totalATPConsumptionRate1 = 0;
                let totalMacromoleculesConsumptionRate1 = 0;


                const CFL = Diffusion.CFL;
    
                for ( let j = 0; j < this.iterations; j++) {
                    
                    for (let i = 0; i < numSegments; i++) {
                        const seg = i*3
                        
                        const NI1 = neighborIndices[seg];
                        const NI2 = neighborIndices[seg+1];
                        const NI3 = neighborIndices[seg+2];
                        const numNeighbors = numberOfNeighbors[i];
                        let sumATP = 0;
                        let sumMacMol = 0;
    
                        if (numNeighbors === 2) {
                            sumATP = oldATP[NI1] + oldATP[NI2];
                            sumMacMol = oldMacMol[NI1] + oldMacMol[NI2];
                        } else if (numNeighbors === 3) {
                            
                            sumATP = oldATP[NI1] + oldATP[NI2] + oldATP[NI3];
                            sumMacMol = oldMacMol[NI1] + oldMacMol[NI2] + oldMacMol[NI3];
                        
                        } else if (numNeighbors === 1) {
                            sumATP = oldATP[NI1]
                            sumMacMol = oldMacMol[NI1];
                        } 

                        const ATPCons=(sinATPS[i]+sinATPM[i])*oldATP[i]
                        const ATPProd=souATP[i]
                        totalATP2 += ATPProd - ATPCons;
                        totalATPConsumptionRate1 += ATPCons;

                        const MacMolCons=(sinMacMolS[i]+sinMacMolM[i])*oldMacMol[i];
                        const MacMolProd= sinATPS[i]*oldATP[i]/ATPtoMacMol;
                        totalMacromolecules2 += MacMolProd - MacMolCons;
                        totalMacromoleculesConsumptionRate1 += MacMolCons;
                        finCell[i] += sinMacMolS[i]*oldMacMol[i];

                        consATPSec[i] += ATPCons;
                        prodATPSec[i] += ATPProd;
                        prodMacMolSec[i] += MacMolProd;
                        consMacMolSec[i] += MacMolCons;
                        

                
                        newATP[i] = oldATP[i] + CFL * (sumATP - numNeighbors * oldATP[i]) + ATPProd - ATPCons;
                        newMacMol[i] = oldMacMol[i] + 0.015*CFL * (sumMacMol - numNeighbors * oldMacMol[i]) + MacMolProd - MacMolCons;
                    }
    
                   
                    oldATP.set(newATP);
                    oldMacMol.set(newMacMol);
    
                }
    
                // Update concentrations in the segments
                for (let i = 0; i < numSegments; i++) {
                    segments[i].ATPConcentration = newATP[i];
                    segments[i].availableMacromolecules = newMacMol[i];
                    segments[i].finishedCell += finCell[i];
                    segments[i].consumptionOfATPInOneSecond = consATPSec[i];
                    segments[i].consumptionOfMacromoleculesInOneSecond = consMacMolSec[i];

                }
                this.totalATP2 += totalATP2;
                this.totalMacromolecules2 += totalMacromolecules2;
                this.totalATPConsumptionRate1 = totalATPConsumptionRate1;
                this.totalMacromoleculesConsumptionRate1 = totalMacromoleculesConsumptionRate1;
         
            }
            initializeoldConcentrations(numSegments) {
                // copy old concentrations from the segments
                    for (let i = 0; i < numSegments; i++) {
                        this.oldConcentrations.ATPConcentration[i] = this.newConcentrations.ATPConcentration[i];
                        this.oldConcentrations.availableMacromolecules[i] = this.newConcentrations.availableMacromolecules[i];
                    }
                    this.consumtionOfATPInOneSecond.fill(0);
                    this.productionOfATPInOneSecond.fill(0);
                    this.consumtionOfMacromoleculesInOneSecond.fill(0);
                    this.productionOfMacromoleculesInOneSecond.fill(0);
                    
        
                } 
            update() {  //every update corresponds to 1 second
          

                if (this.time % Constants.SLOW_UPDATE === 0) { //every 5 seconds
                    this.numberOfCytoplasmSegments = this.totalLengthOfHyphae*2+1;

                    this.resetClosestParticles();

                   
                    this.updateBrownianParticles();
                    this.updateCytoplasmSegments();

                    this.updateQuadtrees();
                    this.numberOfCytoplasmSegments = this.totalLengthOfHyphae*2+1;

                    this.updateSegmentToArrayIndex();
                }
                /* if (this.time % Constants.SLOW_UPDATE !== 0) {
                this.updateBrownianParticles();
                } */

                this.reactionDiffusion();

          
        
        
                this.updateDebugProperties();
                if (this.time > Constants.MAX_TIME || this.totalLengthOfHyphae*2 >= Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS-100) {
                    this.exportData();
                    this.initializeProperties();
                }
                
               
            }
  

    initializeBrownianParticles() {

        const lastSegment = this.cytoplasmSegments[this.cytoplasmSegments.length - 2];
        return [new BrownianParticle(lastSegment.x, lastSegment.y, lastSegment, false,Constants.MAX_FOCI_SIZE/2)];
    }

    addNewCytoplasmSegment(x, y, direction, lastSegment, segments, tipocsize,macmol) {
        let newIndex = lastSegment.index + 1;
        this.totalLengthOfHyphae += 0.5;

       
        const newSegment = new CytoplasmSegment(x, y, direction, newIndex, 0, tipocsize, macmol);
        segments.push(newSegment);
        const hash = lastSegment.branchHash
        newSegment.branchHash = hash;
        if (hash === this.branches[0]) {
            this.lengthOfFirstBranch++;
        }

        lastSegment.addNeighbor(newSegment);
        newSegment.addNeighbor(lastSegment);

        

    }

    initializeCytoplasmSegments() { 

        let Spore = new CytoplasmSegment(
            Constants.CANVAS_WIDTH / 10,
            Constants.CANVAS_HEIGHT / 18,
            Math.PI / 2,
            0,
            0,
            0,
            4
        )

        const segments = [Spore];

        

        Spore.branchHash = this.generateBranchHash(Spore.x, Spore.y);
        this.branches.push(Spore.branchHash);

        let newX = Spore.x + Math.cos(Spore.direction) * Constants.CYTOPLASM_RADIUS;
        let newY = Spore.y + Math.sin(Spore.direction) * Constants.CYTOPLASM_RADIUS;



        this.addNewCytoplasmSegment(
            newX, 
            newY, 
            Math.PI / 2, 
            Spore, 
            segments,
            0.9*Constants.TIPOC_SPLITTING_SIZE,
            4
        );

        this.newConcentrations.availableMacromolecules[0] = 4;
        this.newConcentrations.availableMacromolecules[1] = 4;

        Spore.distanceFromTheTip = 0.5;

        this.lengthOfFirstBranch = 2;

        return segments;
    }

    findClosestCytoplasmSegment(particle) {

        let minDistance = Constants.CYTOPLASM_RADIUS*4;
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
                
            
                if (distanceSquared < minDistanceSquared ){
                
                    if ( neighbors.includes(d)  
                         || d === particle.previousSegment) {
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
        let minDistance = Constants.CYTOPLASM_RADIUS*4;
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

    exportData() {
        //export the history of total length of the hyphae and the number of branches to a csv file
        let csv = '';
        for (let i = 1; i < this.time-5; i += 5) {
            csv += `${i},${this.history.totalLengthOfHyphae[i]},${this.history.numberOfBranches[i]},${this.history.numberOfFoci[i]}\n`;
        }
        const hiddenElement = document.createElement('a');
        hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
        hiddenElement.target = '_blank';
        hiddenElement.download = 'Simulation.csv';
        hiddenElement.click();

        //Export the traces of the foci that are tracked
        let csv2 = '';
        let trackID = 0;
        this.brownianParticles.forEach(particle => {
            if (particle.isTraced) {
                particle.trace.forEach((point, index) => {
                    csv2 += `${trackID},${index},${point.x},${point.y}\n`;
                });
            }
            trackID++;
        });
        const hiddenElement2 = document.createElement('a');
        hiddenElement2.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv2);
        hiddenElement2.target = '_blank';
        hiddenElement2.download = 'Traces.csv';
        hiddenElement2.click();


    }


    updateCytoplasmSegments() {
        this.cytoplasmSegments.forEach(lastPoint => {

      

            if (lastPoint.tipocSize>Constants.TIPOC_SPLITTING_SIZE/2 && lastPoint.finishedCell > Constants.MACROMOLECULES_REQUIRED_FOR_ELONGATION) {
                //console.log(lastPoint.finishedCell);
                // Stretching mechanism at the tip     
                this.brownianParticles.forEach(particle => {
                
                const segment = particle.previousSegment;
                const disp = Constants.DISPLACEMENT;   
                const displacement = (1 / ((segment.distanceFromTheTip/disp)+1)) * (Constants.CYTOPLASM_RADIUS);

                if (segment.originalBranchHash === lastPoint.branchHash) {
                   
                    particle.x += Math.cos(segment.originalDirection) * displacement;
                    particle.y += Math.sin(segment.originalDirection) * displacement;
                    

                
                } 

                else if (segment.branchHash === lastPoint.branchHash) {
                    particle.x += Math.cos(segment.direction) * displacement;
                    particle.y += Math.sin(segment.direction) * displacement;
                } 
        });

                this.cytoplasmSegments.forEach(point => {
                    if (point.branchHash === lastPoint.branchHash) {
                        point.distanceFromTheTip += 0.5; 
                    }
                }); 

                this.elongateCytoplasm(lastPoint);


            }

  
            if ( lastPoint.tipocSize > 0 && lastPoint.tipocSize < Constants.TIPOC_SPLITTING_SIZE) {
                lastPoint.tipocSize += 0.00002*Constants.SLOW_UPDATE*lastPoint.availableMacromolecules;
            }

        });
    }

    elongateCytoplasm(lastPoint) {
        const [newX, newY] = [
            lastPoint.x + Math.cos(lastPoint.direction) * Constants.CYTOPLASM_RADIUS,
            lastPoint.y + Math.sin(lastPoint.direction) * Constants.CYTOPLASM_RADIUS
        ];
        const newDirection = lastPoint.direction + (Math.random() - 0.5) * Constants.CURVINESS;
        if (lastPoint.tipocSize >= Constants.TIPOC_SPLITTING_SIZE) { 
            const newTipoCSize = lastPoint.tipocSize*(0.5+Math.random()/2);
            lastPoint.tipocSize = lastPoint.tipocSize - newTipoCSize;
            lastPoint.originalDirection = newDirection;
            lastPoint.direction = Math.random() < 0.5 ? newDirection + Math.PI / 2 : lastPoint.direction - Math.PI / 2;
            this.addNewCytoplasmSegment(newX, newY, newDirection, lastPoint, this.cytoplasmSegments, newTipoCSize,0);
            const branchHash = this.generateBranchHash(lastPoint.x, lastPoint.y);
            const originalBranchHash = lastPoint.branchHash;
            lastPoint.originalBranchHash = originalBranchHash;
            lastPoint.branchHash = branchHash;
            this.branches.push(branchHash);
        } else  {
             this.addNewCytoplasmSegment(newX, newY, newDirection, lastPoint, this.cytoplasmSegments, lastPoint.tipocSize,0);
             lastPoint.tipocSize = 0;
         } 


   
    
  /*        if (lastPoint.index % Constants.ADD_FOCI_EVERY === 0) {
            this.addNewBrownianParticles(newX, newY, lastPoint);
        }  */ 
          // Add a foci with probability 40%
        if (Math.random() < 0.344) {
            this.addNewBrownianParticles(newX, newY, lastPoint);
        } 



    }


    generateBranchHash(x, y) {
        const uniqueString = `${x},${y}`;
        let hash = 0;
        for (let i = 0; i < uniqueString.length; i++) {
            const char = uniqueString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(16);
    }

    addNewBrownianParticles(x, y, lastSegment) {
        //  randomly chose a cytoplasm segment from all the segments in the same branch as the last segment

        const branchHash = lastSegment.branchHash;


        let randomSegment = this.cytoplasmSegments[Math.floor(Math.random() * this.numberOfCytoplasmSegments)];

        while (randomSegment.branchHash !== branchHash || randomSegment.distanceFromTheTip >= 4) {
            randomSegment = this.cytoplasmSegments[Math.floor(Math.random() * this.numberOfCytoplasmSegments)];
        }

        const newX = randomSegment.x
        const newY = randomSegment.y

/*         const newParticle = new BrownianParticle(
            x - Math.cos(lastSegment.direction) * Constants.CYTOPLASM_RADIUS * (5+15*(Math.random())),
            y - Math.sin(lastSegment.direction) * Constants.CYTOPLASM_RADIUS * (5+15*(Math.random())),
            lastSegment,
            (this.brownianParticles.length) % Constants.TRACE_EVERY_NTH_PARTICLE === 0,
            Constants.INIT_FOCI_SIZE
        );
 */
         const newParticle = new BrownianParticle(
            newX,
            newY,
            randomSegment,
            (this.brownianParticles.length) % Constants.TRACE_EVERY_NTH_PARTICLE === 0,
            Constants.INIT_FOCI_SIZE
        ); 
        
        this.brownianParticles.push(newParticle);
    }


    
    resetClosestParticles() {
        this.cytoplasmSegments.forEach(point => {
            point.resetClosestBrownianParticles(); // Reset closest brownian particles every minute
        });

    }

  

    updateBrownianParticles() {
        this.brownianParticles.forEach(particle => {
            const closestCytoplasmSegment = this.findClosestCytoplasmSegment(particle); 
            //const closestBrownianParticle = this.findClosestBrownianParticle(particle);
            
            particle.updatePosition(closestCytoplasmSegment, this.time);
           // particle.volumeExclusionInteractions(closestBrownianParticle);
/* 
            this.quadtreeBrownianParticles = Quadtree.create(this.brownianParticles);
            const closestBrownianParticle2 = this.findClosestBrownianParticle(particle);
            particle.volumeExclusionInteractions(closestBrownianParticle2);

 */



          /*   if (particle.size < Constants.MAX_FOCI_SIZE){
            particle.size +=  0.001;
            } */
        });

    }



    updateQuadtrees() {
        this.quadtreeBrownianParticles = Quadtree.create(this.brownianParticles);
        this.quadtreeCytoplasmSegments = Quadtree.create(this.cytoplasmSegments);
    }

    updateDebugProperties() {
        this.time++; // this Time is in seconds

        const numberOfSegments = this.numberOfCytoplasmSegments;

        this.totalATP1 = this.newConcentrations.ATPConcentration.reduce((sum, value) => sum + value, 0);
        this.averageATPConcentration = this.totalATP1 / numberOfSegments;

        this.totalMacromolecules1 = this.newConcentrations.availableMacromolecules.reduce((sum, value) => sum + value, 0);
        this.averageMacromolecules = this.totalMacromolecules1 / numberOfSegments;

        this.totalVolumeOfFoci = this.brownianParticles.reduce((sum, particle) => sum + (4/3)*Math.PI*(particle.size*Constants.PIXEL_TO_MICROMETER)**3, 0); 
        //this.totalATPProductionRate1 = this.totalVolumeOfFoci*Constants.ATP_PRODUCTION_RATE*this.iterations;

        


        //this.historyOfLengthOfFirstBranch.push((this.lengthOfFirstBranch-1)*0.5);
        this.history.lengthOfFirstBranch[this.time] = (this.lengthOfFirstBranch-1)*0.5;
        
        if(this.time > 60*30){ // 30 minutes
            this.GrowthRateOfFirstBranch = (this.history.lengthOfFirstBranch[this.time] - this.history.lengthOfFirstBranch[this.time-60*30])/30; // 30 minutes
            this.history.GrowthRateOfFirstBranch[this.time] = this.GrowthRateOfFirstBranch;
        } else {
            this.history.GrowthRateOfFirstBranch[this.time] = 0;
        }

 

    
        this.history.ATP[this.time] = this.totalATP2;
        this.history.averageATP[this.time] = this.averageATPConcentration;
        this.history.totalATPConsumptionRate[this.time] = this.totalATPConsumptionRate1;
        this.history.MacromoleculesConsumptionRate[this.time] = this.totalMacromoleculesConsumptionRate1;
        this.history.averageMacromolecules[this.time] = this.averageMacromolecules;

        this.history.totalLengthOfHyphae[this.time] = this.totalLengthOfHyphae;
        this.history.numberOfBranches[this.time] = this.branches.length;
        this.history.numberOfFoci[this.time] = this.brownianParticles.length;
    }

    draw() {
        this.drawBackground();
        this.drawCytoplasmSegments();
        this.drawLabels();
        //this.drawBorders();
        this.drawScaleBars();
    }


    drawBackground() {
        this.canvas.ctx.fillStyle = 'white';
        this.canvas.ctx.fillRect(0, 0, Constants.CANVAS_WIDTH, Constants.CANVAS_HEIGHT-155);
    }

    drawCytoplasmSegments() {
        this.cytoplasmSegments.forEach(segment => {
            [0, Constants.CANVAS_WIDTH / 3, Constants.CANVAS_WIDTH / 3 * 2].forEach(shift => {
                segment.draw(this.canvas, shift);
            });
        });
        this.brownianParticles.forEach(particle => {
            [0, Constants.CANVAS_WIDTH / 3, Constants.CANVAS_WIDTH / 3 * 2].forEach(shift => {
                particle.draw(this.canvas.ctx, shift);
            });
        });
    }

    drawBorders() {
        for (let i = 0; i < 3; i++) {
            this.canvas.strokeRect(
                i * Constants.CANVAS_WIDTH / 3 + Constants.BORDER / 2,
                Constants.BORDER / 2,
                Constants.CANVAS_WIDTH / 3 - Constants.BORDER,
                Constants.CANVAS_HEIGHT - Constants.BORDER,
                Constants.BORDER_COLOR,
                Constants.BORDER_WIDTH
            );
        }
    }

    drawLabels() {
        const labelY = 40;
        const labelX = 400;
        this.canvas.ctx.textAlign = 'left';
        
        this.canvas.drawScientificNotation( 'Available ATP [x10^6', 'molecules]', Constants.CANVAS_WIDTH / 2 - labelX, labelY);

        //this.canvas.writeText('Available ATP [x10^6]', Constants.CANVAS_WIDTH / 2-labelX, labelY);
        this.canvas.drawScientificNotation('Available macromolecules [x10^6', 'molecules]', Constants.CANVAS_WIDTH / 6-labelX, labelY);
        this.canvas.drawScientificNotation('ATP consumption rate [x10^6 ', 'molecules / s]', 5 * Constants.CANVAS_WIDTH / 6-labelX, labelY);
    
        const totalSeconds = this.time ;
        const minutes = Math.floor(totalSeconds / 60);
        const hours = Math.floor(minutes / 60);
        
        const formattedTime = `${String(hours).padStart(2, '0')}: ${String(minutes % 60).padStart(2, '0')}: ${String(totalSeconds % 60).padStart(2, '0')}`;
        
        //this.canvas.ctx.drawScientificNotation('Total MacMol (1,2): ${this.totalMacromolecules1.toFixed(4)} | ${this.totalMacromolecules2.toFixed(4)  
        this.canvas.ctx.fillText(`Total MacMol (1,2): ${this.totalMacromolecules1.toFixed(4)} | ${this.totalMacromolecules2.toFixed(4)}  x10^6`, Constants.CANVAS_WIDTH / 6-labelX, Constants.CANVAS_HEIGHT - 220);
        this.canvas.ctx.fillText(`Average MacMol: ${this.averageMacromolecules.toFixed(4)} x10^6`, Constants.CANVAS_WIDTH / 6-labelX, Constants.CANVAS_HEIGHT - 200);
        this.canvas.ctx.fillText(`MacMol cons. rate (1): ${this.totalMacromoleculesConsumptionRate1.toFixed(4)} || ${this.consumtionOfMacromoleculesInOneSecond.reduce((sum, value) => sum + value, 0).toFixed(4)}x10^6 / s`, Constants.CANVAS_WIDTH / 6-labelX, Constants.CANVAS_HEIGHT - 180);
        this.canvas.ctx.fillText(`MacMol prod. rate (1):  ${this.productionOfMacromoleculesInOneSecond.reduce((sum, value) => sum + value, 0).toFixed(4)}   x10^6 / s`, Constants.CANVAS_WIDTH / 6-labelX, Constants.CANVAS_HEIGHT - 160);
        
        this.canvas.ctx.fillText(`Total ATP(1,2): ${this.totalATP1.toFixed(4)} | ${this.totalATP2.toFixed(4)} x10^6`, Constants.CANVAS_WIDTH / 2-labelX, Constants.CANVAS_HEIGHT - 220);
        this.canvas.ctx.fillText(`Average ATP: ${this.averageATPConcentration.toFixed(4)} x10^6`, Constants.CANVAS_WIDTH / 2-labelX, Constants.CANVAS_HEIGHT - 200);
        this.canvas.ctx.fillText(`ATP cons. rate: ${this.totalATPConsumptionRate1.toFixed(4)} x10^6 / s`, Constants.CANVAS_WIDTH / 2-labelX, Constants.CANVAS_HEIGHT - 180);
        this.canvas.ctx.fillText(`ATP prod. rate (1): ${this.productionOfATPInOneSecond.reduce((sum, value) => sum + value, 0).toFixed(4)} x10^6 / s`, Constants.CANVAS_WIDTH / 2-labelX, Constants.CANVAS_HEIGHT - 160);
     
        this.canvas.ctx.fillText(`${formattedTime}`, 5*Constants.CANVAS_WIDTH / 6 - labelX, Constants.CANVAS_HEIGHT - 220);
        this.canvas.ctx.fillText(`Total length: ${this.totalLengthOfHyphae.toFixed(1)} µm  | ${this.numberOfCytoplasmSegments} segments` , 5*Constants.CANVAS_WIDTH / 6-labelX, Constants.CANVAS_HEIGHT - 200);
        this.canvas.ctx.fillText(`Growth rate of 1st branch: ${ this.GrowthRateOfFirstBranch.toFixed(2)} µm / min`, 5*Constants.CANVAS_WIDTH / 6-labelX, Constants.CANVAS_HEIGHT - 180);
        this.canvas.ctx.fillText(`Total foci: ${this.brownianParticles.length} foci | ${this.totalVolumeOfFoci.toFixed(3)} µm^3`, 5*Constants.CANVAS_WIDTH / 6-labelX, Constants.CANVAS_HEIGHT - 160);
        
        
    }

    drawPlots() {
        const time = this.time;
        const historyATP = this.history.ATP.slice(0, time);
        const historyAverageATP = this.history.averageATP.slice(0, time);
        //const historyATPConsumptionRate = this.history.totalATPConsumptionRate.slice(0, time);
        const historyAverageMacromolecules = this.history.averageMacromolecules.slice(0, time); 
        const historyLength = this.history.lengthOfFirstBranch.slice(0, time); 
        const historyGrowthRate = this.history.GrowthRateOfFirstBranch.slice(0, time); 
        const historyMacromoleculesConsumptionRate = this.history.MacromoleculesConsumptionRate.slice(0, time);
        this.canvas.ctx.fillStyle = 'white';
        this.canvas.ctx.fillRect(0, Constants.CANVAS_HEIGHT-155, Constants.CANVAS_WIDTH, Constants.CANVAS_HEIGHT);
        
        this.drawSinglePlot(historyLength, historyGrowthRate,  2 * Constants.CANVAS_WIDTH / 3,  "Len first branch (µm)","Growth rate (µm/min)",time);
        this.drawSinglePlot(historyATP, historyAverageATP, Constants.CANVAS_WIDTH / 3, "Total ATP", "Average ATP ",time);
        this.drawSinglePlot(historyAverageMacromolecules, historyMacromoleculesConsumptionRate, 0, "Average Macmol", "Macr. consum. rate",time);
    }

    drawSinglePlot(historyOnTheLeft, historyOnTheRight, XPosition, leftLabel, rightLabel,time) {
        // draw history of ATP in a plot
        const numberOfDataPoints = time;//20000; // 2 hours and 46 minutes
        const slicedHistoryLeft = historyOnTheLeft;//.slice(-numberOfDataPoints);
        const slicedHistoryRight = historyOnTheRight//.slice(-numberOfDataPoints);
        const plotX = XPosition + 55;
        const plotY = Constants.CANVAS_HEIGHT - 150;
        const plotWidth = Constants.CANVAS_WIDTH / 3 - 110;
        const plotHeight = 130;
        const plotLeftColor = 'rgb(200, 0, 0)';
        const plotRightColor = 'rgb(0, 0, 200)';
        const plotLineWidth = 2;
        const plotYLeftMax = slicedHistoryLeft.reduce((max, value) => Math.max(max, value), 0).toFixed(3);
        const plotYRightMax = slicedHistoryRight.reduce((max, value) => Math.max(max, value), 0).toFixed(3);
    
        // Draw ticks on the vertical axes
        const numTicks = 4;
        for (let i = 0; i <= numTicks; i++) {
            const tickY = plotY + plotHeight - (i / numTicks) * plotHeight;
            const tickValueLeft = (plotYLeftMax * i / numTicks).toFixed(2);
            const tickValueRight = (plotYRightMax * i / numTicks).toFixed(2);
    
            this.canvas.ctx.strokeStyle = 'rgb(0, 0, 0, 0.5)';
            this.canvas.ctx.lineWidth = 1;
            this.canvas.ctx.beginPath();
            this.canvas.ctx.moveTo(plotX , tickY);
            this.canvas.ctx.lineTo(plotX + plotWidth, tickY);
            this.canvas.ctx.stroke();
    
            // Left axis ticks and labels
            this.canvas.writeText(tickValueLeft, plotX - 2, tickY + 5, 12, plotLeftColor, 'right');
    
            // Right axis ticks and labels
            this.canvas.writeText(tickValueRight, plotX + plotWidth + 2, tickY + 5, 12,plotRightColor , 'left');
        }
        // draw vertical to show intervals of 30 minutes
        for (let i = 0; i <= time; i += 60*30) {
            const x = plotX + plotWidth * i / time;
            this.canvas.ctx.strokeStyle = 'rgb(0, 0, 0, 0.5)';
            this.canvas.ctx.lineWidth = 1;
            this.canvas.ctx.beginPath();
            this.canvas.ctx.moveTo(x, plotY);
            this.canvas.ctx.lineTo(x, plotY + plotHeight);
            this.canvas.ctx.stroke();

        }
    
        // Draw the plot lines
        this.canvas.ctx.strokeStyle = plotLeftColor;
        this.canvas.ctx.lineWidth = plotLineWidth;
        const pathLeft = new Path2D();
        
        this.canvas.ctx.beginPath();
        for (let index = 0; index < numberOfDataPoints; index++) {
            const value = slicedHistoryLeft[index];
            const x = plotX + plotWidth * index / numberOfDataPoints;
            const y = plotY + plotHeight - (value / plotYLeftMax) * plotHeight;
            if (index === 0) {
                pathLeft.moveTo(x, y);
            } else {
                pathLeft.lineTo(x, y);
            }
        }
        this.canvas.ctx.stroke(pathLeft);
        
        this.canvas.ctx.strokeStyle = plotRightColor;
        const pathRight = new Path2D();
        
        this.canvas.ctx.beginPath();
        for (let index = 0; index < numberOfDataPoints; index++) {
            const value = slicedHistoryRight[index];
            const x = plotX + plotWidth * index / numberOfDataPoints;
            const y = plotY + plotHeight - (value / plotYRightMax) * plotHeight;
            if (index === 0) {
                pathRight.moveTo(x, y);
            } else {
                pathRight.lineTo(x, y);
            }
        }
        this.canvas.ctx.stroke(pathRight);
        // Draw vertical y-axis labels
        this.canvas.ctx.save();
        this.canvas.ctx.translate(plotX - 40, plotY + plotHeight / 2);
        this.canvas.ctx.rotate(-Math.PI / 2);
        this.canvas.writeText(leftLabel, 0, 0, 14,plotLeftColor , 'center');
        this.canvas.ctx.restore();
    
        this.canvas.ctx.save();
        this.canvas.ctx.translate(plotX + plotWidth + 30, plotY + plotHeight / 2);
        this.canvas.ctx.rotate(Math.PI / 2);
        this.canvas.writeText(rightLabel, 0, 0, 14,plotRightColor , 'center');
        this.canvas.ctx.restore();
    }

    drawScaleBars() {
        const scaleBarConfigs = [
            {
                title: 'Distance from the tip',
                xOffset: Constants.CANVAS_WIDTH / 6-400,
                colorFn: (i) => viridisScaleAge(i),
                valueFn: (i) => (Constants.MINIMUM_AVAILABLE_MACROMOLECULES + (i/Constants.SCALE_BAR_SEGMENTS) * (Constants.MAXIMUM_AVAILABLE_MACROMOLECULES-Constants.MINIMUM_AVAILABLE_MACROMOLECULES)).toFixed(2),
            },
            {
                title: 'Concentration',
                xOffset: Constants.CANVAS_WIDTH / 2-400,
                colorFn: (i) => viridisScaleATP(i),
                valueFn: (i) => (Constants.MINIMUM_ATP_CONCENTRATION + (i/Constants.SCALE_BAR_SEGMENTS) * (Constants.MAX_ATP_CONCENTRATION-Constants.MINIMUM_ATP_CONCENTRATION)).toFixed(2),
            },
            {
                title: 'Consumption',
                xOffset: 5 * Constants.CANVAS_WIDTH / 6-400,
                colorFn: (i) => viridisScaleConsumption(i),
                valueFn: (i) =>  (Constants.MINIMUM_ATP_CONSUMPTION_RATE + (i/Constants.SCALE_BAR_SEGMENTS) * (Constants.MAX_ATP_CONSUMPTION_RATE-Constants.MINIMUM_ATP_CONSUMPTION_RATE)).toFixed(2),
            }
        ];

        scaleBarConfigs.forEach(config => this.drawScaleBar(config));


    }

    drawScaleBar(config) {

        for (let i = 0; i <= Constants.SCALE_BAR_SEGMENTS; i++) {
            const x = config.xOffset ;
            const y = Constants.SCALE_BAR_Y_OFFSET + i * Constants.SCALE_BAR_SEGMENT_LENGTH;
            const value = config.valueFn(i);
            const color = config.colorFn(value);

            if(i === 0) {
                this.canvas.writeText(`<${value}`, x + Constants.SCALE_BAR_SEGMENT_WIDTH +5, y + Constants.SCALE_BAR_SEGMENT_LENGTH / 2 + Constants.SCALE_BAR_TEXT_Y_OFFSET);
            } else if (i === Constants.SCALE_BAR_SEGMENTS) {
                this.canvas.writeText(`>${value}`, x + Constants.SCALE_BAR_SEGMENT_WIDTH +5, y + Constants.SCALE_BAR_SEGMENT_LENGTH / 2 + Constants.SCALE_BAR_TEXT_Y_OFFSET);
            }else{

            
            this.canvas.writeText(`${value}`, x + Constants.SCALE_BAR_SEGMENT_WIDTH +5, y + Constants.SCALE_BAR_SEGMENT_LENGTH / 2 + Constants.SCALE_BAR_TEXT_Y_OFFSET);
            }
            this.canvas.fillRect(x, y, Constants.SCALE_BAR_SEGMENT_WIDTH, Constants.SCALE_BAR_SEGMENT_LENGTH, color);
        }
        const factor = 1.5;
        this.canvas.strokeRect(config.xOffset, Constants.SCALE_BAR_Y_OFFSET, Constants.SCALE_BAR_SEGMENT_WIDTH, Constants.SCALE_BAR_SEGMENT_LENGTH * (Constants.SCALE_BAR_SEGMENTS + 1), Constants.BORDER_COLOR, 3);
        //Let's do a bar that is 5 µm long
        this.canvas.writeText('5 µm', config.xOffset + Constants.SCALE_BAR_SEGMENT_WIDTH+705, Constants.SCALE_BAR_Y_OFFSET + 850, 20, 'black');
        this.canvas.fillRect(config.xOffset + Constants.SCALE_BAR_SEGMENT_WIDTH+497+200, Constants.SCALE_BAR_Y_OFFSET + 860, 10*Constants.CYTOPLASM_RADIUS*factor, 7, 'black');

    }
}



