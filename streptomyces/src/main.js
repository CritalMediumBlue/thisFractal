import { Simulation } from './simulation.js';
import { Constants } from './constants.js';

const simulation = new Simulation();
let stopped = false;
let BigTime = 0;
function updateSimulation() {
    if (!stopped) {
        simulation.update(); // Advances the simulation by 1 second
         if (simulation.time % (1*10) === 0) { // Draw every 20 simulation seconds
            simulation.draw();
             if (simulation.time >= Constants.MAX_TIME-100) {
                BigTime++;
                downloadCanvasImage(simulation.getCanvas(), `final_simulation_${BigTime}.png`);
            } 
        } 
    }

    setTimeout(updateSimulation, 0);
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
    }
    else if (event.key === 'd') {
        simulation.draw();
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

// Continuous render loop for OrbitControls & scene display
function renderLoop() {
    simulation.canvas.render();
    requestAnimationFrame(renderLoop);
}

// Draw initial state so meshes are visible immediately
simulation.draw();

// Start both loops
updateSimulation();
renderLoop();
