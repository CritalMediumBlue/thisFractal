import { Constants } from './constants.js';
import { Canvas } from './canvas.js';
import { HyphaeGrowth } from './hyphaeGrowth.js';
import { ParticleManager } from './particleManager.js';
import { ReactionDiffusionSolver } from './reactionDiffusion.js';
import { Renderer } from './renderer.js';
import { Statistics } from './statistics.js';
import { exportSimulationData, exportTraces } from './dataExport.js';
import { PhysicsWorld } from './physicsWorld.js';

export class Simulation {
    constructor() {
        this.canvas = new Canvas();
        this.solver = new ReactionDiffusionSolver();
        this.hyphaeGrowth = new HyphaeGrowth();
        this.physicsWorld = new PhysicsWorld();
        this.particleManager = new ParticleManager(this.physicsWorld);
        this.renderer = new Renderer();
        this.stats = new Statistics();
        this.initializeProperties();
    }

    initializeProperties() {
        this.physicsWorld.init();
        this.solver.init();
        this.hyphaeGrowth.init(this.solver);
        this.particleManager.init(this.hyphaeGrowth.cytoplasmSegments);
        this.renderer.init(this.canvas.scene);
        this.stats.init();
        this.numberOfCytoplasmSegments = 0;
        this.stopped = false;
    }

    get time() {
        return this.stats.time;
    }

    getCanvas() {
        return this.canvas.renderer.domElement;
    }

    update() {
        const spacing = Constants.SEGMENT_SPACING;
            this.numberOfCytoplasmSegments = Math.round(this.hyphaeGrowth.totalLengthOfHyphae / spacing) + 1;

            this.particleManager.resetClosestParticles(this.hyphaeGrowth.cytoplasmSegments);
            this.particleManager.updateBrownianParticles(this.stats.time);
            this.hyphaeGrowth.updateCytoplasmSegments(
                this.particleManager.brownianParticles,
                this.particleManager,
                this.numberOfCytoplasmSegments,
                this.physicsWorld
            );
            this.particleManager.updateQuadtrees(this.hyphaeGrowth.cytoplasmSegments);
            this.numberOfCytoplasmSegments = Math.round(this.hyphaeGrowth.totalLengthOfHyphae / spacing) + 1;
            this.hyphaeGrowth.numberOfCytoplasmSegments = this.numberOfCytoplasmSegments;

            this.solver.updateSegmentToArrayIndex(
                this.hyphaeGrowth.cytoplasmSegments,
                this.numberOfCytoplasmSegments
            );
        

        this.solver.step(this.hyphaeGrowth.cytoplasmSegments, this.numberOfCytoplasmSegments);

        // Sync solver accumulators to stats
        this.stats.totalATP2 = this.solver.totalATP2;
        this.stats.totalMacromolecules2 = this.solver.totalMacromolecules2;
        this.stats.totalATPConsumptionRate1 = this.solver.totalATPConsumptionRate1;
        this.stats.totalMacromoleculesConsumptionRate1 = this.solver.totalMacromoleculesConsumptionRate1;

        this.stats.record(this);

        if (this.stats.time > Constants.MAX_TIME || Math.round(this.hyphaeGrowth.totalLengthOfHyphae / spacing) >= Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS - 100) {
            
            exportSimulationData(this.stats.history, this.stats.time);

            exportTraces(this.particleManager.brownianParticles);

            this.draw(this.stopped);

            const link = document.createElement('a');
            const filename = `final_simulation_${this.stats.time}.png`;
            link.href = this.canvas.renderer.domElement.toDataURL('image/png');
            link.download = filename;
            link.click();

            this.initializeProperties();
        }
    }

    draw(stopped, selectedBranch) {
        this.renderer.draw(
            this.hyphaeGrowth.cytoplasmSegments,
            this.particleManager.brownianParticles,
            this.numberOfCytoplasmSegments,
            this.canvas,
            stopped,
            selectedBranch
        );


    }
}


