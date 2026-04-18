export const Constants = {
    //TIPOC Constants (TIPOC = TIP Organizing Center), the TIPOC is a structure that is responsible for the growth of the tip of the hyphae.
    TIPOC_SPLITTING_SIZE:1, // Once the TIPOC reaches this size, it will asymmetrically split into two TIPOCs. Branching the hyphae in the future.
    SLOW_UPDATE: 5,
    FOCUS_RADIUS: 150,
    TRUE_FOCI_SIZE: 15, 
    TIPOC_GROWTH_RATE: 0.00002, // This is the rate at which the TIPOC grows. The TIPOC grows by consuming macromolecules, so the growth rate is multiplied by the number of available macromolecules in the segment.
    //distance from the tip to the first RNAP patch appears to be around 1.8 µm +- 0.3 µm. 
    // RNAP (RNA polymerase) patches are the sites of active transcription, and thus also the sites of translation and protein production.
    DISTANCE_FROM_TIP_TO_FIRST_RNAP_PATCH: 1800, // nanometers
    STANDARD_DEVIATION_FOR_RNAP_PATCH: 300, // nanometers. This is used to add some variability to the distance from the tip to the first RNAP patch, based on the experimental data.




    MINIMUM_ATP_CONCENTRATION:  (1/1000000)*6.022e23 *0.8/1e18, // millions of molecules per segment. This data is based on the literature. The minimum concentration of ATP in living cells is arround 1mM per µm^3.
    MAX_ATP_CONCENTRATION: 5 * (1/1000000)*6.022e23 *0.8/1e18, // millions of molecules per segment. This data is based on the literature. The maximum concentration of ATP in living cells is arround 5mM per µm^3.
    ATP_PRODUCTION_RATE: 0.0008, // Millions of Molecules per second per µm^3 of FOCI
    ATP_TO_MACROMOLECULES: 500, // How many ATP molecules are required to produce one macromolecule

    // Geometry of the hyphae
    SEGMENT_SPACING: 310, // nm — real-world distance between cytoplasm segment centers
    CYTOPLASM_RADIUS: 350, // nanometers 
    INT_CYTOPLASM_RADIUS: 310, // nanometers
    THETA_START: Math.PI/3  , // Starting angle for segment spheres (radians)
    THETA_LENGTH:  Math.PI/3, // Angular length for segment spheres (radians)
    WIDTH_SEGMENTS: 20, 
    HEIGHT_SEGMENTS: 1,
    WIDTH_SEGMENTS_TIP: 15,
    HEIGHT_SEGMENTS_TIP: 3,
    CURVINESS: 0.35, // Higher values make t8he hyphae more tortuous, lower values make the hyphae more straight
    MACROMOLECULES_REQUIRED_FOR_ELONGATION:0.3, // This tells us how many macromolecules have to be consumed in each cytoplasm segment for the hyphae to elongate (Add a new segment at the tip).

    // Brownian particles (foci) constants
    ADD_FOCI_EVERY: 2,  //every 2th cytoplasm segment a green fluorescent foci is added
    INIT_FOCI_SIZE: 6.6, // nanometers
    MAX_FOCI_SIZE: 6.8,  // nanometers
    TRACE_EVERY_NTH_PARTICLE: 1, // to add a trace and follow the movement of the particles (foci).
    MAX_TRACE_LENGTH: 2000, // how many points are stored in the trace
    DISPLACEMENT:1000, // nanometers — This tells us how the cytoplasm stretches at the tip each time it grows. Low values make the cytoplasm stretch only at the very tip, high values make the cytoplasm stretch along the whole hyphae.
    DECAY:4500, // nanometers

    //Diffusion of Foci
    Do:((1.38e-23*293)/(6*Math.PI*6))*800*0.00001,




    MAX_NUMBER_OF_CYTOPLASM_SEGMENTS: 20000,


    //Measuring distances
    MAX_TIME:60*60*4,//60*60*8, // 8 hours




};

//Diffusion constants
const DiffusionCoefficient= 100e6; // nm^2/s (= 100 µm^2/s)
const dX = Constants.SEGMENT_SPACING; // nm
const dX2 = dX * dX; // nm^2

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
   


