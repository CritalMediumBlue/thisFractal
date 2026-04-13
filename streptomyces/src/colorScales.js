import { Constants } from './constants.js';
import { scaleSequential } from 'd3-scale';
import { interpolateViridis } from 'd3-scale-chromatic';

export const viridisScaleAge = scaleSequential(interpolateViridis).domain([Constants.MINIMUM_AVAILABLE_MACROMOLECULES,Constants.MAXIMUM_AVAILABLE_MACROMOLECULES]);
export const viridisScaleATP = scaleSequential(interpolateViridis).domain([Constants.MINIMUM_ATP_CONCENTRATION, Constants.MAX_ATP_CONCENTRATION]);
export const viridisScaleConsumption = scaleSequential(interpolateViridis).domain([Constants.MINIMUM_ATP_CONSUMPTION_RATE, Constants.MAX_ATP_CONSUMPTION_RATE]);