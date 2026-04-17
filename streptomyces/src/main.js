import { Simulation } from './simulation.js';
import { RAPIER } from './physicsWorld.js';

async function start() {
await RAPIER.init();

const simulation = new Simulation();
let stopped = false;



function updateSimulation() {
    if (!stopped) {
        simulation.update(); 
    }
    setTimeout(updateSimulation, 0);
}





function downloadCanvasImage(canvas, filename) {
    simulation.draw(); // Ensure the latest frame is rendered before downloading
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = filename;
    link.click();
}

addEventListener('keydown', function (event) {
    if (event.key === 's') {
        stopped = !stopped;
    } else if (event.key === 'ArrowRight' && stopped) {
        simulation.update();
    } else if (event.key === 'd') {
        const canvas = simulation.getCanvas();
        downloadCanvasImage(canvas, `simulation_${simulation.time/120}.png`);
    }
});



// Continuous render loop for OrbitControls & scene display
function renderLoop() {
    simulation.draw();
    setTimeout(renderLoop, 100); // ~10 FPS, adjust as needed
}



updateSimulation();
renderLoop();

} 




start();
