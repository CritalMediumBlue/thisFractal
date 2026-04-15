export function exportSimulationData(history, time) {
    let csv = '';
    for (let i = 1; i < time - 5; i += 5) {
        csv += `${i},${history.totalLengthOfHyphae[i]},${history.numberOfBranches[i]},${history.numberOfFoci[i]}\n`;
    }
    const hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    hiddenElement.target = '_blank';
    hiddenElement.download = 'Simulation.csv';
    hiddenElement.click();
}

export function exportTraces(brownianParticles) {
    let csv = '';
    let trackID = 0;
    brownianParticles.forEach(particle => {
        if (particle.isTraced) {
            particle.trace.forEach((point) => {
                csv += `${trackID},${point.time},${point.x},${point.y}\n`;
            });
        }
        trackID++;
    });
    const hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    hiddenElement.target = '_blank';
    hiddenElement.download = 'Traces.csv';
    hiddenElement.click();
}
