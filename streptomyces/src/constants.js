export const Constants = {
    //TIPOC Constants (TIPOC = TIP Organizing Center), the TIPOC is a structure that is responsible for the growth of the tip of the hyphae.
    MAXIMUM_TIPOC_SIZE: 0.6, // This tells us the maximum size a TIPOC can have. It also tell us at which size the TIPOC will reach its maximum consumption rate of macromolecules.
    TIPOC_SPLITTING_SIZE:1, // Once the TIPOC reaches this size, it will asymmetrically split into two TIPOCs. Branching the hyphae in the future.
    TIPOC_GRWOTH_RATE: 1/280, // the rate at which the TIPOC consumes macromolecules and grows.
    SLOW_UPDATE: 5,
    FOCUS_RADIUS: 200,
    //Growth rate constants
   
    MINIMUM_ATP_CONCENTRATION:  (1/1000000)*6.022e23 *0.8/1e18, // millions of molecules per segment. This data is based on the literature. The minimum concentration of ATP in living cells is arround 1mM per µm^3.
    MAX_ATP_CONCENTRATION: 5 * (1/1000000)*6.022e23 *0.8/1e18, // millions of molecules per segment. This data is based on the literature. The maximum concentration of ATP in living cells is arround 5mM per µm^3.
    MINIMUM_ATP_CONSUMPTION_RATE: 0.2*0.8*1.9, // millions of molecules per segment per second. This data is based on the literature. The minimum consumption rate of ATP in living cells is arround 0.15 millions of ATP molecules per second.
    MAX_ATP_CONSUMPTION_RATE: 6.4*0.8, // millions of molecules per segment per second. This data is based on the literature. The maximum consumption rate of ATP in living cells is arround 5 millions of ATP molecules per second.
    MINIMUM_AVAILABLE_MACROMOLECULES: 2, // This is not based on any data, it is just a placeholder for the minimum value of available macromolecules in the cytoplasm.
    MAXIMUM_AVAILABLE_MACROMOLECULES: 4, // This is not based on any data, it is just a placeholder for the maximum value of available macromolecules in the cytoplasm.
    ATP_PRODUCTION_RATE: 100, // Millions of Molecules per second per µm^3 of FOCI
    ATP_TO_MACROMOLECULES: 2000, // How many ATP molecules are required to produce one macromolecule
    FOCI_GROWTH_RATE: 0.01, // how much the foci grow every second

    // Geometry of the hyphae
    CYTOPLASM_RADIUS: 500, // micrometers
    INT_CYTOPLASM_RADIUS: 458, // micrometers
    CYTOPLASM_VOLUME: Math.PI/4, // µm^3
    CURVINESS: 0.35, // Higher values make the hyphae more tortuous, lower values make the hyphae more straight
    MACROMOLECULES_REQUIRED_FOR_ELONGATION:8, // This tells us how many macromolecules have to be consumed in each cytoplasm segment for the hyphae to elongate (Add a new segment at the tip).

    // Brownian particles (foci) constants
    ADD_FOCI_EVERY: 3,  //every 6th cytoplasm segment a green fluorescent foci is added
    INIT_FOCI_SIZE: 0.0066, // micrometers
    MAX_FOCI_SIZE: 0.0068,  // micrometers
    //INITIAL_FOCI_SIZE: 2.5,
    TRACE_EVERY_NTH_PARTICLE: 1, // to add a trace and follow the movement of the particles (foci).
    MAX_TRACE_LENGTH: 2000, // how many points are stored in the trace
    addtrace: false, // if true, traces are added to the particles
    DISPLACEMENT:1, // This tells us how the cytoplasm stretches at the tip each time it grows. Low values make the cytoplasm stretch only at the very tip, high values make the cytoplasm stretch along the whole hyphae.
    DECAY:4.5,

    //Diffusion of Foci
    Do:((1.38e-23*293)/(6*Math.PI*6))*800*0.5,





    // Scale bars constants
    SCALE_BAR_SEGMENTS: 10,
    SCALE_BAR_SEGMENT_LENGTH: 80,
    SCALE_BAR_SEGMENT_WIDTH: 16,
    SCALE_BAR_Y_OFFSET: 50,
    SCALE_BAR_TEXT_Y_OFFSET: 5,
    CANVAS_WIDTH: 2500  ,
    CANVAS_HEIGHT: 1400,
    MAX_NUMBER_OF_CYTOPLASM_SEGMENTS: 20000,


    //Measuring distances
    MAX_TIME:60*60*4,//60*60*8, // 8 hours




};

//Diffusion constants
const DiffusionCoefficient= 100; // µm^2/s
const dX = 0.5; // µm
const dX2 = dX * dX; // µm^2    
const maximumDimensions = 1.5; // µm
const stabilityCriteria = dX2 / (2 * DiffusionCoefficient * maximumDimensions); // s
const dT = 0.99 * stabilityCriteria; // s
const numberOftimestepsPerSecond = 1 / dT; // s^-1
export const Diffusion = {
    
    CFL: DiffusionCoefficient * dT / dX2, // unitless
    numberOftimestepsPerSecond: numberOftimestepsPerSecond, // s^-1
 
}; 
   


