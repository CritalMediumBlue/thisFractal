import { Constants, Diffusion } from './constants.js';
import { Canvas } from './canvas.js';
import { CytoplasmSegment } from './cytoplasmSegment.js';
import { BrownianParticle } from './brownianParticle.js';
import { Quadtree } from './quadtree.js';
import { viridisToThreeColor } from './colorScales.js';
import * as THREE from 'three';

const MAX_PARTICLES = 10000;
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

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

        // --- Three.js InstancedMesh setup ---
        this._initMeshes();
    }

    _initMeshes() {
        // Remove previous meshes if they exist (simulation reset)
        if (this.segmentMesh) {
            this.canvas.scene.remove(this.segmentMesh);
            this.segmentMesh.geometry.dispose();
            this.segmentMesh.material.dispose();
        }
        if (this.particleMesh) {
            this.canvas.scene.remove(this.particleMesh);
            this.particleMesh.geometry.dispose();
            this.particleMesh.material.dispose();
        }
        if (this.tipocMesh) {
            this.canvas.scene.remove(this.tipocMesh);
            this.tipocMesh.geometry.dispose();
            this.tipocMesh.material.dispose();
        }
        if (this.tipSegmentMesh) {
            this.canvas.scene.remove(this.tipSegmentMesh);
            this.tipSegmentMesh.geometry.dispose();
            this.tipSegmentMesh.material.dispose();
        }
        if (this.tipIntSegmentMesh) {
            this.canvas.scene.remove(this.tipIntSegmentMesh);
            this.tipIntSegmentMesh.geometry.dispose();
            this.tipIntSegmentMesh.material.dispose();
        }

        // Segment spheres
        const segGeo = new THREE.SphereGeometry(Constants.CYTOPLASM_RADIUS, 8, 2, 0, Math.PI*2.0, Math.PI/3 , Math.PI/3);
        const segMat = new THREE.MeshBasicMaterial({ vertexColors: false,  wireframe: true });        
        this.segmentMesh = new THREE.InstancedMesh(segGeo, segMat, Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS);
        this.segmentMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        // Allocate instance color buffer
        this.segmentMesh.instanceColor = new THREE.InstancedBufferAttribute(
            new Float32Array(Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS * 3), 3
        );
        this.segmentMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
        this.segmentMesh.count = 0;
        this.segmentMesh.frustumCulled = false;
        this.canvas.scene.add(this.segmentMesh);



        const intSegGeo = new THREE.SphereGeometry(Constants.INT_CYTOPLASM_RADIUS, 8, 2, 0, Math.PI*2.0, Math.PI/3 , Math.PI/3);
        const intSegMat = new THREE.MeshBasicMaterial({ vertexColors: false,  wireframe: true });
        this.intSegmentMesh = new THREE.InstancedMesh(intSegGeo, intSegMat, Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS);
        this.intSegmentMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.intSegmentMesh.instanceColor = new THREE.InstancedBufferAttribute(
            new Float32Array(Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS * 3), 3
        );
        this.intSegmentMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
        this.intSegmentMesh.count = 0;
        this.intSegmentMesh.frustumCulled = false;
        this.canvas.scene.add(this.intSegmentMesh);

        // Tip segment spheres (wider arc)
        const tipSegGeo = new THREE.SphereGeometry(Constants.CYTOPLASM_RADIUS, 10, 3, 0, Math.PI*2.0, 0, 2*Math.PI/3);
        const tipSegMat = new THREE.MeshBasicMaterial({ vertexColors: false, wireframe: true });
        this.tipSegmentMesh = new THREE.InstancedMesh(tipSegGeo, tipSegMat, Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS);
        this.tipSegmentMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.tipSegmentMesh.instanceColor = new THREE.InstancedBufferAttribute(
            new Float32Array(Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS * 3), 3
        );
        this.tipSegmentMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
        this.tipSegmentMesh.count = 0;
        this.tipSegmentMesh.frustumCulled = false;
        this.canvas.scene.add(this.tipSegmentMesh);

        const tipIntSegGeo = new THREE.SphereGeometry(Constants.INT_CYTOPLASM_RADIUS, 10, 3, 0, Math.PI*2.0, 0 , 2*Math.PI/3);
        const tipIntSegMat = new THREE.MeshBasicMaterial({ vertexColors: false, wireframe: true });
        this.tipIntSegmentMesh = new THREE.InstancedMesh(tipIntSegGeo, tipIntSegMat, Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS);
        this.tipIntSegmentMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.tipIntSegmentMesh.instanceColor = new THREE.InstancedBufferAttribute(
            new Float32Array(Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS * 3), 3
        );
        this.tipIntSegmentMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
        this.tipIntSegmentMesh.count = 0;
        this.tipIntSegmentMesh.frustumCulled = false;
        this.canvas.scene.add(this.tipIntSegmentMesh);

        // Particle spheres (smaller, green)
        const partGeo = new THREE.SphereGeometry(Constants.FOCUS_RADIUS , 8, 8);
        const partMat = new THREE.MeshBasicMaterial({ color: 0x66ff66,  opacity: 0.5, transparent: true  , });
        this.particleMesh = new THREE.InstancedMesh(partGeo, partMat, MAX_PARTICLES);
        this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.particleMesh.count = 0;
        this.particleMesh.frustumCulled = false;
        this.canvas.scene.add(this.particleMesh);
        


        // TIPOC spheres (red)
        const tipocGeo = new THREE.SphereGeometry(Constants.CYTOPLASM_RADIUS , 20, 20, 0, Math.PI*2.0, 0 , Math.PI/3);
        const tipocMat = new THREE.MeshBasicMaterial({ color: 0xff4444, wireframe: true });
        this.tipocMesh = new THREE.InstancedMesh(tipocGeo, tipocMat, Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS);
        this.tipocMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.tipocMesh.count = 0;
        this.tipocMesh.frustumCulled = false;
        this.canvas.scene.add(this.tipocMesh);
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
        return this.canvas.renderer.domElement;
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
           
            0,
            0,
            0,
            Constants.TIPOC_SPLITTING_SIZE*0.95,
            4
        )

        const segments = [Spore];

        

        Spore.branchHash = this.generateBranchHash(Spore.x, Spore.y);
        this.branches.push(Spore.branchHash);

        let newX = Spore.x + Math.cos(Spore.direction- Math.PI) * Constants.CYTOPLASM_RADIUS;
        let newY = Spore.y + Math.sin(Spore.direction- Math.PI) * Constants.CYTOPLASM_RADIUS;



        this.addNewCytoplasmSegment(
            newX, 
            newY, 
            Math.PI , 
            Spore, 
            segments,
            Constants.TIPOC_SPLITTING_SIZE*0.95,
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


   
    
          if (lastPoint.index % Constants.ADD_FOCI_EVERY === 0) {
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
            const closestBrownianParticle = this.findClosestBrownianParticle(particle);

            particle.updatePosition(closestCytoplasmSegment, closestBrownianParticle, this.time);
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

        this.totalVolumeOfFoci = this.brownianParticles.reduce((sum, particle) => sum + (4/3)*Math.PI*(particle.size)**3, 0); 
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
        const segCount = this.numberOfCytoplasmSegments;
        let regularCount = 0;
        let tipCount = 0;

        for (let i = 0; i < segCount; i++) {
            const seg = this.cytoplasmSegments[i];
            _dummy.position.set(seg.x, seg.y, 0);
            _dummy.rotation.set(0, 0, seg.direction - Math.PI / 2);
            _dummy.scale.set(1, 1, 1);
            _dummy.updateMatrix();
            viridisToThreeColor(seg.ATPConcentration, _color);

            if (seg.tipocSize > 0) {
                this.tipSegmentMesh.setMatrixAt(tipCount, _dummy.matrix);
                this.tipIntSegmentMesh.setMatrixAt(tipCount, _dummy.matrix);
                this.tipSegmentMesh.setColorAt(tipCount, _color);
                this.tipIntSegmentMesh.setColorAt(tipCount, _color);
                tipCount++;
            } else {
                this.segmentMesh.setMatrixAt(regularCount, _dummy.matrix);
                this.intSegmentMesh.setMatrixAt(regularCount, _dummy.matrix);
                this.segmentMesh.setColorAt(regularCount, _color);
                this.intSegmentMesh.setColorAt(regularCount, _color);
                regularCount++;
            }
        }
        this.segmentMesh.count = regularCount;
        this.segmentMesh.instanceMatrix.needsUpdate = true;
        if (this.segmentMesh.instanceColor) this.segmentMesh.instanceColor.needsUpdate = true;
        this.intSegmentMesh.count = regularCount;
        this.intSegmentMesh.instanceMatrix.needsUpdate = true;
        if (this.intSegmentMesh.instanceColor) this.intSegmentMesh.instanceColor.needsUpdate = true;
        this.tipSegmentMesh.count = tipCount;
        this.tipSegmentMesh.instanceMatrix.needsUpdate = true;
        if (this.tipSegmentMesh.instanceColor) this.tipSegmentMesh.instanceColor.needsUpdate = true;
        this.tipIntSegmentMesh.count = tipCount;
        this.tipIntSegmentMesh.instanceMatrix.needsUpdate = true;
        if (this.tipIntSegmentMesh.instanceColor) this.tipIntSegmentMesh.instanceColor.needsUpdate = true;

        const partCount = Math.min(this.brownianParticles.length, MAX_PARTICLES);
        this.particleMesh.count = partCount;

        for (let i = 0; i < partCount; i++) {
            const p = this.brownianParticles[i];
            _dummy.position.set(p.x, p.y, 0);
            _dummy.rotation.set(0, 0, 0);
            _dummy.scale.set(1, 1, 1);
            _dummy.updateMatrix();
            this.particleMesh.setMatrixAt(i, _dummy.matrix);
        }
        this.particleMesh.instanceMatrix.needsUpdate = true;

        // TIPOC spheres — only for segments with tipocSize > 0
        let tipocCount = 0;
        for (let i = 0; i < segCount; i++) {
            const seg = this.cytoplasmSegments[i];
            if (seg.tipocSize > 0) {
                //get growth direction
                const growthDirection = seg.direction;
                //get the rotation angle for the growth direction
                const rotationAngle = growthDirection - Math.PI / 2; 
                const diffX = Math.cos(growthDirection) * Constants.CYTOPLASM_RADIUS * 0.5;
                const diffY = Math.sin(growthDirection) * Constants.CYTOPLASM_RADIUS * 0.5;
                _dummy.position.set(seg.x , seg.y , 0);
                _dummy.rotation.set(0, 0, rotationAngle);
                const scale = seg.tipocSize ;
                _dummy.scale.set(scale, scale, scale);
                _dummy.updateMatrix();
                this.tipocMesh.setMatrixAt(tipocCount, _dummy.matrix);
                tipocCount++;
            }
        }
        this.tipocMesh.count = tipocCount;
        this.tipocMesh.instanceMatrix.needsUpdate = true;

        this.canvas.render();
    }

    drawPlots() {
        // 2D plots removed — now using 3D renderer only
    }
}



