import { Simulation } from './simulation.js';
import { Constants } from './constants.js';

const simulation = new Simulation();
let stopped = false;
let BigTime = 0;
function updateSimulation() {
    if (!stopped) {
        simulation.update(); // Advances the simulation by 1 second
        //simulation.draw();
         if (simulation.time % (1*60) === 0) { // Save an image every 10 minutes
            simulation.draw();
            
            simulation.drawPlots();
             if (simulation.time >= Constants.MAX_TIME-100) {
                //download the image
                BigTime++;

            } 
            //const canvas = simulation.getCanvas();
            //downloadCanvasImage(canvas, `${BigTime}simulation_${simulation.time/(5*12)}.png`);
        } 
    }

    // Use setImmediate if available, or fallback to setTimeout
    setTimeout(updateSimulation, 0);
}

function renderDrawing() {
    if (!stopped) {
        simulation.draw();
    }
}

function renderPlots() {
    if (!stopped) {
        simulation.drawPlots();
    }
}

function downloadCanvasImage(canvas, filename) {
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = filename;
    link.click();
}

addEventListener('keydown', function (event) {
    if (event.key === 's') {
        stopped = !stopped;
        if (stopped) {
            simulation.canvas.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            simulation.canvas.ctx.fillRect(0, 0, simulation.canvas.canvas.width, simulation.canvas.canvas.height);
            const color = 'rgba(255, 255, 255, 0.4)';
            simulation.canvas.writeText(
                'Paused',
                simulation.canvas.canvas.width / 2,
                simulation.canvas.canvas.height / 2 + 100,
                400,
                color,
                'center'
            );
        }
    }
    else if (event.key === 'd') {
        simulation.drawPlots();
            const canvas = simulation.getCanvas();
            downloadCanvasImage(canvas, `simulation_${simulation.time/120}.png`);
    }
});

addEventListener('keydown', function (event) {
    if (event.key === 'ArrowRight' && stopped) {
        simulation.update();
        simulation.draw();
    }
});

// Start the simulation and rendering loops
updateSimulation();

//setInterval(renderDrawing, 1000); 
//setInterval(renderPlots, 2000);

