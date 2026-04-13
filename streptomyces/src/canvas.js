
export class Canvas {
    constructor() {
        this.canvas = document.querySelector('#canvas');
        this.ctx = this.canvas.getContext('2d'); 
    }

    writeText(text, x, y, size=20, color='black', align='left') {
        this.ctx.fillStyle = color;
        this.ctx.font = `bold ${size}px Arial`;        
        this.ctx.textAlign = align; // Center the text horizontally
        this.ctx.fillText(text, x, y);
    }

    strokeRect(x, y, width, height, color, lineWidth) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.fillStyle = color;
        this.ctx.strokeRect(x, y, width, height);
    }
    fillRect(x, y, width, height, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
    }
    drawScientificNotation( text, text2, x, y) {
        this.ctx.fillStyle = 'black';

        const parts = text.split('^');
        this.ctx.font = '22px Arial';
        this.ctx.fillText(parts[0], x, y);
        const measure = this.ctx.measureText(parts[0]).width;
        this.ctx.font = '18px Arial';
        this.ctx.fillText(parts[1], x +measure, y - 10);
        this.ctx.font = '22px Arial';
        const measure2 = this.ctx.measureText(parts[1]).width;
        this.ctx.fillText(text2, x +measure + measure2, y );
    }
}