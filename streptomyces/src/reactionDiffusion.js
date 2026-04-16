import { Constants, Diffusion } from './constants.js';
import { thomasAlgorithm } from './thomas.js';

export class ReactionDiffusionSolver {
    constructor() {
        this.init();
    }

    init() {
        const N = Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS;

        // CN implicit diffusion uses fewer timesteps than explicit Euler
        this.iterations = Diffusion.CN_ITERATIONS;
        this.dt = Diffusion.CN_DT;

        this.ATP = new Float64Array(N);
        this.MacMol = new Float64Array(N);

        this.sources = {
            ATPConcentration: new Float32Array(N),
        };

        this.sinks = {
            availableMacromolecules_S: new Float64Array(N),
            availableMacromolecules_M: new Float64Array(N),
            ATPConcentration_S: new Float64Array(N),
            ATPConcentration_M: new Float64Array(N),
        };

        this.finnishedCell = new Float64Array(N);
        this.consumtionOfATPInOneSecond = new Float64Array(N);
        this.consumtionOfMacromoleculesInOneSecond = new Float64Array(N);
        this.oldATP = new Float64Array(N);
        this.oldMacMol = new Float64Array(N);

        this.segmentToArrayIndex = new Map();

        // Branch decomposition: list of ordered index arrays, one per branch
        this.branches = [];          // Array<Int32Array> — each is an ordered chain of array indices
        this.junctionIndices = [];   // Array indices of nodes with 3 neighbors

        // Thomas algorithm scratch arrays (reused across branches)
        const maxBranchLen = N;
        this.lower = new Float64Array(maxBranchLen);
        this.main = new Float64Array(maxBranchLen);
        this.upper = new Float64Array(maxBranchLen);
        this.rhs = new Float64Array(maxBranchLen);
        this.modUpper = new Float64Array(maxBranchLen);
        this.modRHS = new Float64Array(maxBranchLen);
        this.sol = new Float64Array(maxBranchLen);

        // Accumulator outputs (read by Statistics)
        this.totalATP2 = 0;
        this.totalMacromolecules2 = 0;
        this.totalATPConsumptionRate1 = 0;
        this.totalMacromoleculesConsumptionRate1 = 0;
    }

    updateSegmentToArrayIndex(cytoplasmSegments, numberOfCytoplasmSegments) {
        for (let i = 0; i < numberOfCytoplasmSegments; i++) {
            this.segmentToArrayIndex.set(cytoplasmSegments[i], i);
        }

        // Compute sources and sinks as per-SECOND rates.
        // The old explicit solver applied these once per sub-step over ~1212 sub-steps,
        // so the original values were per-sub-step rates. Multiply by OLD_SUBSTEPS
        // to convert to per-second rates for the new CN scheme.
        const OLD_SUBSTEPS = Diffusion.OLD_SUBSTEPS_PER_SECOND;

        for (let i = 0; i < numberOfCytoplasmSegments; i++) {
            const segment = cytoplasmSegments[i];
            segment.neighborIndices = segment.neighbors.map(
                (neighbor) => this.segmentToArrayIndex.get(neighbor)
            );

            const numberOfFoci = segment.closestFoci.length;
            const foci = segment.closestFoci;
            if (numberOfFoci > 0) {
                let source = 0;
                for (let j = 0; j < numberOfFoci; j++) {
                    source += Constants.ATP_PRODUCTION_RATE * (foci[j].size) ** 2;
                }
                this.sources.ATPConcentration[i] = Constants.ATP_PRODUCTION_RATE* OLD_SUBSTEPS; //source * OLD_SUBSTEPS;
            } else {
                this.sources.ATPConcentration[i] = Constants.ATP_PRODUCTION_RATE* OLD_SUBSTEPS;
            }

            this.sinks.availableMacromolecules_S[i] = 2.5 * (0.0000001 * segment.tipocSize) * OLD_SUBSTEPS;
            this.sinks.availableMacromolecules_M[i] = 2.5 * 0.00000003 * OLD_SUBSTEPS;
            this.sinks.ATPConcentration_S[i] = (0.8) * (0.004 / ((segment.distanceFromTheTip / Constants.DECAY) + 1)) * OLD_SUBSTEPS;
            this.sinks.ATPConcentration_M[i] = 0;
        }

        // Decompose the tree into linear branches for the Thomas algorithm
        this._decomposeBranches(cytoplasmSegments, numberOfCytoplasmSegments);
    }

    // =========================================================================
    // Branch decomposition — extract linear chains from the segment tree
    // =========================================================================
    _decomposeBranches(segments, numSegments) {
        this.branches = [];
        this.junctionIndices = [];

        const visitedEdges = new Set();

        const edgeKey = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`);

        for (let i = 0; i < numSegments; i++) {
            const degree = segments[i].neighborIndices.length;
            if (degree >= 3) {
                this.junctionIndices.push(i);
            }
        }

        for (let i = 0; i < numSegments; i++) {
            const degree = segments[i].neighborIndices.length;
            if (degree === 2) {
                continue;
            }

            const neighbors = segments[i].neighborIndices;
            for (let j = 0; j < neighbors.length; j++) {
                const firstNeighbor = neighbors[j];
                const firstKey = edgeKey(i, firstNeighbor);
                if (visitedEdges.has(firstKey)) {
                    continue;
                }

                const chain = [i];
                let previous = i;
                let current = firstNeighbor;
                visitedEdges.add(firstKey);

                while (true) {
                    chain.push(current);

                    const currentNeighbors = segments[current].neighborIndices;
                    if (currentNeighbors.length !== 2) {
                        break;
                    }

                    const next = currentNeighbors[0] === previous
                        ? currentNeighbors[1]
                        : currentNeighbors[0];
                    const nextKey = edgeKey(current, next);
                    visitedEdges.add(nextKey);
                    previous = current;
                    current = next;
                }

                if (chain.length >= 2) {
                    this.branches.push(new Int32Array(chain));
                }
            }
        }
    }

    // =========================================================================
    // Strang splitting:  React(dt/2) → Diffuse(dt) → React(dt/2)
    // =========================================================================
    step(cytoplasmSegments, numberOfCytoplasmSegments) {
        const n = numberOfCytoplasmSegments;
        const dt = this.dt;

        // Load concentrations from segments into flat arrays
        for (let i = 0; i < n; i++) {
            this.ATP[i] = cytoplasmSegments[i].ATPConcentration;
            this.MacMol[i] = cytoplasmSegments[i].availableMacromolecules;
        }

        // Reset per-second accumulators
        this.consumtionOfATPInOneSecond.fill(0);
        this.consumtionOfMacromoleculesInOneSecond.fill(0);

        let totalATP2 = 0;
        let totalMacromolecules2 = 0;
        let totalATPConsumptionRate1 = 0;
        let totalMacromoleculesConsumptionRate1 = 0;

        for (let iter = 0; iter < this.iterations; iter++) {
            // ── React half-step (dt/2) ──────────────────────────────────────
            this._reactHalfStep(n, dt * 0.5);

            // ── Diffuse full step (dt) — CN on each branch ──────────────────
            this._diffuseStep(cytoplasmSegments, n, dt);

            // ── React half-step (dt/2) ──────────────────────────────────────
            this._reactHalfStep(n, dt * 0.5);

            // ── Accumulate statistics ───────────────────────────────────────
            const souATP = this.sources.ATPConcentration;
            const sinATPS = this.sinks.ATPConcentration_S;
            const sinATPM = this.sinks.ATPConcentration_M;
            const sinMacMolS = this.sinks.availableMacromolecules_S;
            const sinMacMolM = this.sinks.availableMacromolecules_M;
            const ATPtoMacMol = Constants.ATP_TO_MACROMOLECULES;

            for (let i = 0; i < n; i++) {
                const ATPCons = (sinATPS[i] + sinATPM[i]) * this.ATP[i] * dt;
                const ATPProd = souATP[i] * dt;
                totalATP2 += ATPProd - ATPCons;
                totalATPConsumptionRate1 += ATPCons;

                const MacMolCons = (sinMacMolS[i] + sinMacMolM[i]) * this.MacMol[i] * dt;
                totalMacromolecules2 += sinATPS[i] * this.ATP[i] * dt / ATPtoMacMol - MacMolCons;
                totalMacromoleculesConsumptionRate1 += MacMolCons;

                this.finnishedCell[i] += sinMacMolS[i] * this.MacMol[i] * dt;
                this.consumtionOfATPInOneSecond[i] += ATPCons;
                this.consumtionOfMacromoleculesInOneSecond[i] += MacMolCons;
            }
        }

        // Write results back to segments
        for (let i = 0; i < n; i++) {
            cytoplasmSegments[i].ATPConcentration = this.ATP[i];
            cytoplasmSegments[i].availableMacromolecules = this.MacMol[i];
            cytoplasmSegments[i].finishedCell += this.finnishedCell[i];
            cytoplasmSegments[i].consumptionOfATPInOneSecond = this.consumtionOfATPInOneSecond[i];
            cytoplasmSegments[i].consumptionOfMacromoleculesInOneSecond = this.consumtionOfMacromoleculesInOneSecond[i];
        }
        this.finnishedCell.fill(0);

        this.totalATP2 += totalATP2;
        this.totalMacromolecules2 += totalMacromolecules2;
        this.totalATPConsumptionRate1 = totalATPConsumptionRate1;
        this.totalMacromoleculesConsumptionRate1 = totalMacromoleculesConsumptionRate1;
    }

    // =========================================================================
    // Semi-implicit reaction half-step (per node, no coupling)
    // =========================================================================
    _reactHalfStep(n, halfDt) {
        const ATP = this.ATP;
        const MacMol = this.MacMol;
        const souATP = this.sources.ATPConcentration;
        const sinATPS = this.sinks.ATPConcentration_S;
        const sinATPM = this.sinks.ATPConcentration_M;
        const sinMacMolS = this.sinks.availableMacromolecules_S;
        const sinMacMolM = this.sinks.availableMacromolecules_M;
        const ATPtoMacMol = Constants.ATP_TO_MACROMOLECULES;

        for (let i = 0; i < n; i++) {
            // ATP: implicit sink, explicit source
            //   u^{n+1} = (u^n + dt * source) / (1 + dt * sink)
            const atpSink = sinATPS[i] + sinATPM[i];
            const atpSource = souATP[i];
            ATP[i] = (ATP[i] + halfDt * atpSource) / (1.0 + halfDt * atpSink);

            // Macromolecules: production from ATP consumption, minus own sinks
            const macSink = sinMacMolS[i] + sinMacMolM[i];
            const macSource = sinATPS[i] * ATP[i] / ATPtoMacMol;
            MacMol[i] = (MacMol[i] + halfDt * macSource) / (1.0 + halfDt * macSink);
        }
    }

    // =========================================================================
    // Crank-Nicolson diffusion step on each branch via Thomas algorithm
    // =========================================================================
    _diffuseStep(cytoplasmSegments, n, dt) {
        const D_ATP = Diffusion.DiffusionCoefficient;
        const D_MacMol = Diffusion.DiffusionCoefficient * 0.015;
        const dX2 = Diffusion.dX2;

        // CN parameter: r = D * dt / (2 * dX^2)
        const r_ATP = D_ATP * dt / (2.0 * dX2);
        const r_MacMol = D_MacMol * dt / (2.0 * dX2);

        this.oldATP.set(this.ATP.subarray(0, n), 0);
        this.oldMacMol.set(this.MacMol.subarray(0, n), 0);

        this._solveSpeciesDiffusion(cytoplasmSegments, this.ATP, this.oldATP, r_ATP);
        this._solveSpeciesDiffusion(cytoplasmSegments, this.MacMol, this.oldMacMol, r_MacMol);
    }

    _solveSpeciesDiffusion(cytoplasmSegments, u, oldU, r) {
        const maxJunctionSweeps = 6;
        const tolerance = 1e-8;

        for (let sweep = 0; sweep < maxJunctionSweeps; sweep++) {
            for (const branch of this.branches) {
                this._solveBranchCN(cytoplasmSegments, branch, u, oldU, r);
            }

            let maxDelta = 0;
            for (let i = 0; i < this.junctionIndices.length; i++) {
                const junctionIndex = this.junctionIndices[i];
                const neighbors = cytoplasmSegments[junctionIndex].neighborIndices;
                const degree = neighbors.length;
                let sumOld = 0;
                let sumNew = 0;

                for (let j = 0; j < degree; j++) {
                    const neighborIndex = neighbors[j];
                    sumOld += oldU[neighborIndex];
                    sumNew += u[neighborIndex];
                }

                const nextValue = (
                    (1 - r * degree) * oldU[junctionIndex]
                    + r * (sumOld + sumNew)
                ) / (1 + r * degree);

                const delta = Math.abs(nextValue - u[junctionIndex]);
                if (delta > maxDelta) {
                    maxDelta = delta;
                }
                u[junctionIndex] = nextValue;
            }

            if (maxDelta < tolerance) {
                break;
            }
        }
    }

    // =========================================================================
    // Solve CN diffusion on one linear branch using the Thomas algorithm
    // =========================================================================
    _solveBranchCN(cytoplasmSegments, branch, u, oldU, r) {
        const len = branch.length;
        if (len < 2) return;

        const lower = this.lower;
        const main = this.main;
        const upper = this.upper;
        const rhs = this.rhs;

        for (let k = 0; k < len; k++) {
            const idx = branch[k];
            const degree = cytoplasmSegments[idx].neighborIndices.length;

            if (k === 0 || k === len - 1) {
                if (degree >= 3) {
                    // Junction: keep as Dirichlet during branch solve; update later
                    main[k] = 1.0;
                    lower[k] = 0.0;
                    upper[k] = 0.0;
                    rhs[k] = u[idx];
                } else {
                    // Tip / spore: zero-flux Neumann boundary.
                    // Using a mirrored ghost point gives a doubled neighbor coefficient.
                    main[k] = 1.0 + 2.0 * r;
                    rhs[k] = (1.0 - 2.0 * r) * oldU[idx];

                    if (k === 0) {
                        lower[k] = 0.0;
                        upper[k] = -2.0 * r;
                        rhs[k] += 2.0 * r * oldU[branch[k + 1]];
                    } else {
                        lower[k] = -2.0 * r;
                        upper[k] = 0.0;
                        rhs[k] += 2.0 * r * oldU[branch[k - 1]];
                    }
                }
            } else {
                lower[k] = -r;
                main[k] = 1.0 + 2.0 * r;
                upper[k] = -r;

                const idxPrev = branch[k - 1];
                const idxNext = branch[k + 1];
                rhs[k] = r * oldU[idxPrev] + (1.0 - 2.0 * r) * oldU[idx] + r * oldU[idxNext];
            }
        }

        thomasAlgorithm(lower, main, upper, rhs, len,
            this.modUpper, this.modRHS, this.sol);

        for (let k = 0; k < len; k++) {
            const idx = branch[k];
            const degree = cytoplasmSegments[idx].neighborIndices.length;
            if ((k === 0 || k === len - 1) && degree >= 3) {
                continue;
            }
            u[idx] = this.sol[k];
        }
    }
}
