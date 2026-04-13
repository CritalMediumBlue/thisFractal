import { Constants } from './constants.js';
import { quadtree } from 'd3-quadtree';

export class Quadtree {
    static create(data) {
        return quadtree()
            .extent([[0, 0], [Constants.CANVAS_WIDTH, Constants.CANVAS_HEIGHT]])
            .x(d => d.x)
            .y(d => d.y)
            .addAll(data);
    }
}