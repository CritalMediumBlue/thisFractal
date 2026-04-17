import { quadtree } from 'd3-quadtree';

export class Quadtree {
    static create(data) {
        return quadtree()
            .extent([[-100000, -100000], [100000, 100000]])
            .x(d => d.x)
            .y(d => d.y)
            .addAll(data);
    }
}