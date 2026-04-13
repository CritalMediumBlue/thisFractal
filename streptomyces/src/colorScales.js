import { Constants } from './constants.js';
import { scaleSequential } from 'd3-scale';
import { interpolateViridis } from 'd3-scale-chromatic';
import { Color } from 'three';

export const viridisScaleATP = scaleSequential(interpolateViridis).domain([Constants.MINIMUM_ATP_CONCENTRATION, Constants.MAX_ATP_CONCENTRATION]);

const _tmpColor = new Color();

/**
 * Convert an ATP concentration value to a THREE.Color via the viridis scale.
 * Writes into the supplied Color (or an internal scratch) and returns it.
 */
export function viridisToThreeColor(value, target) {
    const css = viridisScaleATP(value); // e.g. "rgb(68, 1, 84)"
    const out = target || _tmpColor;
    out.setStyle(css);
    return out;
}