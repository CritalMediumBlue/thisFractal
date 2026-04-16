import { Constants, Diffusion } from './constants.js';

export class ReactionDiffusionSolver {
    constructor() {
        this.init();
    }

    init() {
        const N = Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS;

        this.iterations = Diffusion.numberOftimestepsPerSecond;

        this.newConcentrations = {
            availableMacromolecules: new Float64Array(N),
            ATPConcentration: new Float64Array(N)
        };

        this.oldConcentrations = {
            availableMacromolecules: new Float64Array(N),
            ATPConcentration: new Float64Array(N)
        };

        this.sources = {
            ATPConcentration: new Float32Array(N),
            availableMacromolecules: new Float32Array(N)
        };

        this.sinks = {
            availableMacromolecules_S: new Float64Array(N),
            availableMacromolecules_M: new Float64Array(N),
            ATPConcentration_S: new Float64Array(N),
            ATPConcentration_M: new Float64Array(N)
        };

        this.finnishedCell = new Float64Array(N);
        this.consumtionOfATPInOneSecond = new Float64Array(N);
        this.consumtionOfMacromoleculesInOneSecond = new Float64Array(N);
        this.numberOfNeighbors = new Int8Array(N);
        this.neighborIndices = new Int16Array(N * 3);

        this.segmentToArrayIndex = new Map();

        // Accumulator outputs (read by Statistics)
        this.totalATP2 = 0;
        this.totalMacromolecules2 = 0;
        this.totalATPConsumptionRate1 = 0;
        this.totalMacromoleculesConsumptionRate1 = 0;
    }

    updateSegmentToArrayIndex(cytoplasmSegments, numberOfCytoplasmSegments) {
        const iterations = this.iterations;

        for (let i = 0; i < numberOfCytoplasmSegments; i++) {
            const segment = cytoplasmSegments[i];
            this.segmentToArrayIndex.set(segment, i);
        }

        for (let i = 0; i < numberOfCytoplasmSegments; i++) {
            const segment = cytoplasmSegments[i];
            segment.neighborIndices = segment.neighbors.map(
                (neighbor) => this.segmentToArrayIndex.get(neighbor)
            );
            this.numberOfNeighbors[i] = segment.neighborIndices.length;
            this.neighborIndices[i * 3] = segment.neighborIndices[0];
            this.neighborIndices[i * 3 + 1] = segment.neighborIndices[1];
            this.neighborIndices[i * 3 + 2] = segment.neighborIndices[2];

            const numberOfFoci = segment.closestFoci.length;
            const foci = segment.closestFoci;
            if (numberOfFoci > 0) {
                let source = 0;
                for (let j = 0; j < numberOfFoci; j++) {
                    const focusj = foci[j];
                    source += (Constants.ATP_PRODUCTION_RATE * (focusj.size) ** 2) * 1212 / iterations;
                }
                this.sources.ATPConcentration[i] = 0.001;//source;
            } else {
                this.sources.ATPConcentration[i] = 0.001;
            }

            this.sinks.availableMacromolecules_S[i] = 2.5 * (0.0000001 * segment.tipocSize) * (1212 / iterations);
            this.sinks.availableMacromolecules_M[i] = 2.5 * 0.00000003 * (1212 / iterations);
            this.sinks.ATPConcentration_S[i] = (0.8) * (0.004 / ((segment.distanceFromTheTip / Constants.DECAY) + 1)) * (1212 / iterations);
            this.sinks.ATPConcentration_M[i] = 0;//(0.4) * (0.0019) * (1212 / iterations);
        }
    }

    step(cytoplasmSegments, numberOfCytoplasmSegments) {
        const numSegments = numberOfCytoplasmSegments;
        const numberOfNeighbors = this.numberOfNeighbors;
        const neighborIndices = this.neighborIndices;

        this._initializeOldConcentrations(numSegments);

        const newATP = this.newConcentrations.ATPConcentration;
        const oldATP = this.oldConcentrations.ATPConcentration;
        const newMacMol = this.newConcentrations.availableMacromolecules;
        const oldMacMol = this.oldConcentrations.availableMacromolecules;
        const souATP = this.sources.ATPConcentration;
        const sinATPS = this.sinks.ATPConcentration_S;
        const sinATPM = this.sinks.ATPConcentration_M;
        const sinMacMolS = this.sinks.availableMacromolecules_S;
        const sinMacMolM = this.sinks.availableMacromolecules_M;
        const segments = cytoplasmSegments;
        const finCell = this.finnishedCell;
        const consATPSec = this.consumtionOfATPInOneSecond;
        const consMacMolSec = this.consumtionOfMacromoleculesInOneSecond;
        const ATPtoMacMol = Constants.ATP_TO_MACROMOLECULES;
        let totalATP2 = 0;
        let totalMacromolecules2 = 0;
        let totalATPConsumptionRate1 = 0;
        let totalMacromoleculesConsumptionRate1 = 0;

        const CFL = Diffusion.CFL;

        for (let j = 0; j < this.iterations; j++) {
            for (let i = 0; i < numSegments; i++) {
                const seg = i * 3;

                const NI1 = neighborIndices[seg];
                const NI2 = neighborIndices[seg + 1];
                const NI3 = neighborIndices[seg + 2];
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
                    sumATP = oldATP[NI1];
                    sumMacMol = oldMacMol[NI1];
                }

                const ATPCons = (sinATPS[i] + sinATPM[i]) * oldATP[i];
                const ATPProd = souATP[i];
                totalATP2 += ATPProd - ATPCons;
                totalATPConsumptionRate1 += ATPCons;

                const MacMolCons = (sinMacMolS[i] + sinMacMolM[i]) * oldMacMol[i];
                const MacMolProd = sinATPS[i] * oldATP[i] / ATPtoMacMol;
                totalMacromolecules2 += MacMolProd - MacMolCons;
                totalMacromoleculesConsumptionRate1 += MacMolCons;
                finCell[i] += sinMacMolS[i] * oldMacMol[i];

                consATPSec[i] += ATPCons;
                consMacMolSec[i] += MacMolCons;

                newATP[i] = oldATP[i] + CFL * (sumATP - numNeighbors * oldATP[i]) + ATPProd - ATPCons;
                newMacMol[i] = oldMacMol[i] + 0.015 * CFL * (sumMacMol - numNeighbors * oldMacMol[i]) + MacMolProd - MacMolCons;
            }

            oldATP.set(newATP);
            oldMacMol.set(newMacMol);
        }

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

    _initializeOldConcentrations(numSegments) {
        for (let i = 0; i < numSegments; i++) {
            this.oldConcentrations.ATPConcentration[i] = this.newConcentrations.ATPConcentration[i];
            this.oldConcentrations.availableMacromolecules[i] = this.newConcentrations.availableMacromolecules[i];
        }
        this.consumtionOfATPInOneSecond.fill(0);
        this.consumtionOfMacromoleculesInOneSecond.fill(0);
    }
}
