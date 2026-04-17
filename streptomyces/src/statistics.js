import { Constants } from './constants.js';

export class Statistics {
    constructor() {
        this.init();
    }

    init() {
        this.time = 0;

        this.totalATP1 = 0;
        this.totalATP2 = 0;

        this.totalMacromolecules1 = 0;
        this.totalMacromolecules2 = 8;

        this.totalATPConsumptionRate1 = 0;
        this.totalMacromoleculesConsumptionRate1 = 0;

        this.averageATPConcentration = 0;
        this.averageMacromolecules = 0;

        this.GrowthRateOfFirstBranch = 0;

        this.history = {
            ATP: new Float32Array(Constants.MAX_TIME),
            averageATP: new Float32Array(Constants.MAX_TIME),
            totalATPConsumptionRate: new Float32Array(Constants.MAX_TIME),
            lengthOfFirstBranch: new Float32Array(Constants.MAX_TIME),
            GrowthRateOfFirstBranch: new Float32Array(Constants.MAX_TIME),
            MacromoleculesConsumptionRate: new Float32Array(Constants.MAX_TIME),
            averageMacromolecules: new Float32Array(Constants.MAX_TIME),
            totalLengthOfHyphae: new Float32Array(Constants.MAX_TIME),
            numberOfBranches: new Float32Array(Constants.MAX_TIME),
            numberOfFoci: new Float32Array(Constants.MAX_TIME),
        };
    }

    record(sim) {
        this.time++;

        const numberOfSegments = sim.numberOfCytoplasmSegments;
        const segments = sim.hyphaeGrowth.cytoplasmSegments;

        this.totalATP1 = 0;
        this.totalMacromolecules1 = 0;
        for (let i = 0; i < numberOfSegments; i++) {
            this.totalATP1 += segments[i].ATPConcentration;
            this.totalMacromolecules1 += segments[i].availableMacromolecules;
        }
        this.averageATPConcentration = this.totalATP1 / numberOfSegments;
        this.averageMacromolecules = this.totalMacromolecules1 / numberOfSegments;

        this.history.lengthOfFirstBranch[this.time] = (sim.hyphaeGrowth.lengthOfFirstBranch - 1) * Constants.SEGMENT_SPACING;

        if (this.time > 60 * 30) {
            this.GrowthRateOfFirstBranch = (this.history.lengthOfFirstBranch[this.time] - this.history.lengthOfFirstBranch[this.time - 60 * 30]) / 30;
            this.history.GrowthRateOfFirstBranch[this.time] = this.GrowthRateOfFirstBranch;
        } else {
            this.history.GrowthRateOfFirstBranch[this.time] = 0;
        }

        this.history.ATP[this.time] = this.totalATP2;
        this.history.averageATP[this.time] = this.averageATPConcentration;
        this.history.totalATPConsumptionRate[this.time] = this.totalATPConsumptionRate1;
        this.history.MacromoleculesConsumptionRate[this.time] = this.totalMacromoleculesConsumptionRate1;
        this.history.averageMacromolecules[this.time] = this.averageMacromolecules;

        this.history.totalLengthOfHyphae[this.time] = sim.hyphaeGrowth.totalLengthOfHyphae;
        this.history.numberOfBranches[this.time] = sim.hyphaeGrowth.branches.length;
        this.history.numberOfFoci[this.time] = sim.particleManager.brownianParticles.length;
    }
}
