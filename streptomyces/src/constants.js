export const Constants = {
    //TIPOC Constants (TIPOC = TIP Organizing Center), the TIPOC is a structure that is responsible for the growth of the tip of the hyphae.
    TIPOC_SPLITTING_SIZE:1, // Once the TIPOC reaches this size, it will asymmetrically split into two TIPOCs. Branching the hyphae in the future.
    SLOW_UPDATE: 5,
    FOCUS_RADIUS: 150,
   
    MINIMUM_ATP_CONCENTRATION:  (1/1000000)*6.022e23 *0.8/1e18, // millions of molecules per segment. This data is based on the literature. The minimum concentration of ATP in living cells is arround 1mM per µm^3.
    MAX_ATP_CONCENTRATION: 5 * (1/1000000)*6.022e23 *0.8/1e18, // millions of molecules per segment. This data is based on the literature. The maximum concentration of ATP in living cells is arround 5mM per µm^3.
    ATP_PRODUCTION_RATE: 1000, // Millions of Molecules per second per µm^3 of FOCI
    ATP_TO_MACROMOLECULES: 200, // How many ATP molecules are required to produce one macromolecule

    // Geometry of the hyphae
    SEGMENT_SPACING: 350, // nm — real-world distance between cytoplasm segment centers
    CYTOPLASM_RADIUS: 350, // nanometers 
    INT_CYTOPLASM_RADIUS: 310, // nanometers
    CURVINESS: 0.35, // Higher values make t8he hyphae more tortuous, lower values make the hyphae more straight
    MACROMOLECULES_REQUIRED_FOR_ELONGATION:0.1, // This tells us how many macromolecules have to be consumed in each cytoplasm segment for the hyphae to elongate (Add a new segment at the tip).

    // Brownian particles (foci) constants
    ADD_FOCI_EVERY: 3,  //every 3th cytoplasm segment a green fluorescent foci is added
    INIT_FOCI_SIZE: 0.0066, // micrometers
    MAX_FOCI_SIZE: 0.0068,  // micrometers
    TRACE_EVERY_NTH_PARTICLE: 1, // to add a trace and follow the movement of the particles (foci).
    MAX_TRACE_LENGTH: 2000, // how many points are stored in the trace
    DISPLACEMENT:1, // This tells us how the cytoplasm stretches at the tip each time it grows. Low values make the cytoplasm stretch only at the very tip, high values make the cytoplasm stretch along the whole hyphae.
    DECAY:4.5,

    //Diffusion of Foci
    Do:((1.38e-23*293)/(6*Math.PI*6))*800*0.5,





    CANVAS_WIDTH: 2500  ,
    CANVAS_HEIGHT: 1400,
    MAX_NUMBER_OF_CYTOPLASM_SEGMENTS: 20000,


    //Measuring distances
    MAX_TIME:60*60*4,//60*60*8, // 8 hours




};

//Diffusion constants
const DiffusionCoefficient= 100; // µm^2/s
const dX = Constants.SEGMENT_SPACING / 1000; // convert nm to µm for diffusion
const dX2 = dX * dX; // µm^2

// Crank-Nicolson implicit scheme — unconditionally stable, so we can use
// far fewer iterations than the old explicit Euler (~1212 per second).
const CN_ITERATIONS = 10;        // number of sub-steps per simulation second
const CN_DT = 1.0 / CN_ITERATIONS; // time step per sub-step (seconds)

// The old explicit Euler scheme ran this many sub-steps per second.
// Source/sink rates were calibrated as per-sub-step values, so we need
// this factor to convert them to true per-second rates for the CN scheme.
const OLD_SUBSTEPS_PER_SECOND = 1.0 / (0.99 * dX2 / (2 * DiffusionCoefficient * 1.5)); // ≈ 1212

export const Diffusion = {
    DiffusionCoefficient: DiffusionCoefficient,
    dX2: dX2,
    CN_ITERATIONS: CN_ITERATIONS,
    CN_DT: CN_DT,
    OLD_SUBSTEPS_PER_SECOND: OLD_SUBSTEPS_PER_SECOND,
}; 
   


