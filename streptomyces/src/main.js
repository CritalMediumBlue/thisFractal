import { Simulation } from './simulation.js';
import { RAPIER } from './physicsWorld.js';

async function start() {
await RAPIER.init();

const simulation = new Simulation();
let selectedBranch = 0; // You can set this to a specific branch hash to focus on that branch


function updateSimulation() {
    if (!simulation.stopped) {
        simulation.update();
    }
    setTimeout(updateSimulation, 0);
}





function downloadCanvasImage(canvas, filename) {
    simulation.draw(simulation.stopped); // Ensure the latest frame is rendered before downloading
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = filename;
    link.click();
}

let _branchInputBuffer = '';
let _branchInputTimer = null;

function _commitBranchInput() {
    const n = parseInt(_branchInputBuffer);
    selectedBranch = isNaN(n) ? 0 : n;
    _branchInputBuffer = '';
    _branchInputTimer = null;
}

addEventListener('keydown', function (event) {
    if (event.key === ' ' || event.key === 'Spacebar') {
        simulation.stopped = !simulation.stopped;
    } else if (event.key === 'ArrowRight' && simulation.stopped) {
        simulation.update();
    } else if (event.key === 'd') {
        const canvas = simulation.getCanvas();
        downloadCanvasImage(canvas, `simulation_${simulation.time/120}.png`);
    } else if (event.key >= '0' && event.key <= '9') {
        // Accumulate digits; commit after 500ms of no further input or on Enter
        _branchInputBuffer += event.key;
        clearTimeout(_branchInputTimer);
        _branchInputTimer = setTimeout(_commitBranchInput, 500);
    } else if (event.key === 'Enter' && _branchInputBuffer.length > 0) {
        clearTimeout(_branchInputTimer);
        _commitBranchInput();
    } else if (event.key === 'Escape') {
        clearTimeout(_branchInputTimer);
        _branchInputBuffer = '';
        selectedBranch = 0; // Reset — deselect branch
    }
});



// Continuous render loop for OrbitControls & scene display
function renderLoop() {
    simulation.draw(simulation.stopped, selectedBranch);
    setTimeout(renderLoop, 100); // ~10 FPS, adjust as needed
}



updateSimulation();
renderLoop();

} 




start();
