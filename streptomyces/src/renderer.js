import { Constants } from './constants.js';
import { viridisToThreeColor } from './colorScales.js';
import * as THREE from 'three';

const MAX_PARTICLES = 10000;
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const grayColor = new THREE.Color(0x606060);
const _zAxis = new THREE.Vector3(0, 0, 1);
const _ringDir = new THREE.Vector3();
const capsulesEvery = 4; // how many segments between each capsule/ring

function _makeTextSprite(lines) {
    if (!Array.isArray(lines)) lines = [lines];
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const lineHeight = 15;
    const startY = lineHeight * 0.5;
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(200,200, 1);

    for (let i = 0; i < lines.length; i++) {
        ctx.fillStyle = 'black';

        ctx.fillText(lines[i], lineHeight/2, startY + i * lineHeight);

        // draw the canvas boundary as a white rectangle for debugging and add a point
        // at the center of the canvas to visualize the anchor point of the sprite
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'blue';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 1.5, 0, Math.PI * 2);
        ctx.fill();

        
    }

    return sprite;
}

export class Renderer {
    constructor() {
        this.segmentMesh = null;
        this.intSegmentMesh = null;
        this.particleMesh = null;
        this.trueParticleMesh = null;
        this.tipocMesh = null;
        this.ringMesh = null;
        this._lastSegCount = -1;
        this._regularCount = 0;
        this._tipCount = 0;
        this._stopped = null;
        this.labels = [];
        this.scene = null;
        this.helperAxis = new THREE.AxesHelper(5000);
        this.helperAxis.position.set(0.1, 0.1, 0.1); // slight offset to prevent z-fighting with segment meshes
        this.helperGrid = new THREE.GridHelper(100000, 100);
        this.helperGrid.rotation.x = Math.PI / 2; // rotate to XY plane
        this._helpersVisible = false;
    }

    init(scene) {
        this.scene = scene;
        this._disposeMeshes(scene);

        // Segment Spheres
        const segGeo = new THREE.SphereGeometry(Constants.CYTOPLASM_RADIUS, Constants.WIDTH_SEGMENTS, Constants.HEIGHT_SEGMENTS, 0, Math.PI * 2.0, Constants.THETA_START, Constants.THETA_LENGTH);
        const segMat = new THREE.MeshBasicMaterial({ vertexColors: false, wireframe: true });
        this.segmentMesh = new THREE.InstancedMesh(segGeo, segMat, Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS);
        this.segmentMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.segmentMesh.instanceColor = new THREE.InstancedBufferAttribute(
            new Float32Array(Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS * 3), 3
        );
        this.segmentMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
        this.segmentMesh.count = 0;
        this.segmentMesh.frustumCulled = false;
        scene.add(this.segmentMesh);



        // Internal segment spheres

        const intSegGeo = new THREE.SphereGeometry(Constants.INT_CYTOPLASM_RADIUS, Constants.WIDTH_SEGMENTS_INT, Constants.HEIGHT_SEGMENTS, 0, Math.PI * 2.0, Constants.THETA_START, Constants.THETA_LENGTH);
        const intSegMat = new THREE.MeshBasicMaterial({ vertexColors: false, wireframe: true });
        this.intSegmentMesh = new THREE.InstancedMesh(intSegGeo, intSegMat, Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS);
        this.intSegmentMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.intSegmentMesh.instanceColor = new THREE.InstancedBufferAttribute(
            new Float32Array(Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS * 3), 3
        );
        this.intSegmentMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
        this.intSegmentMesh.count = 0;
        this.intSegmentMesh.frustumCulled = false;
        scene.add(this.intSegmentMesh);


        // Particle spheres Airi disk (smaller, green)
        const partGeo = new THREE.SphereGeometry(Constants.FOCUS_RADIUS, 6, 6);
        const partMat = new THREE.MeshBasicMaterial({ color: 0x66ff66, wireframe: true });
        this.particleMesh = new THREE.InstancedMesh(partGeo, partMat, MAX_PARTICLES);
        this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.particleMesh.count = 0;
        this.particleMesh.frustumCulled = false;
        scene.add(this.particleMesh);


        //Protein particle (true size of the foci) - also green but smaller than the Airi disk
        const truePartGeo = new THREE.SphereGeometry(Constants.TRUE_FOCI_SIZE, 7, 7);
        const truePartMat = new THREE.MeshBasicMaterial({ color: 0x20FF20, wireframe: true });
        this.trueParticleMesh = new THREE.InstancedMesh(truePartGeo, truePartMat, MAX_PARTICLES);
        this.trueParticleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.trueParticleMesh.count = 0;
        this.trueParticleMesh.frustumCulled = false;
        scene.add(this.trueParticleMesh);
 

       //Create the shapes for the separation of the hyphae as rings
        const ringGeo = new THREE.RingGeometry(Constants.INT_CYTOPLASM_RADIUS*0.5, Constants.INT_CYTOPLASM_RADIUS*1, 15);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x303030, side: THREE.DoubleSide });
        this.ringMesh = new THREE.InstancedMesh(ringGeo, ringMat, Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS);
        this.ringMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.ringMesh.count = 0;
        this.ringMesh.frustumCulled = false;
        scene.add(this.ringMesh);

        // TIPOC spheres (red)
        const tipocGeo = new THREE.SphereGeometry(Constants.INT_CYTOPLASM_RADIUS, 20, 20, 0, Math.PI * 2.0, 0, Math.PI / 3);
        const tipocMat = new THREE.MeshBasicMaterial({ color: 0xff4444, wireframe: true });
        this.tipocMesh = new THREE.InstancedMesh(tipocGeo, tipocMat, Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS);
        this.tipocMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.tipocMesh.count = 0;
        this.tipocMesh.frustumCulled = false;
        scene.add(this.tipocMesh);
    }

    draw(cytoplasmSegments, brownianParticles, segCount, canvas, stopped, selectedBranch) {
        const segmentsChanged = segCount !== this._lastSegCount;
        const stoppedChanged = stopped !== this._stopped;

        if (segmentsChanged) {
            // Segments were added or reclassified (tip→regular) — rebuild matrices + colors
            this._rebuildSegmentMatrices(cytoplasmSegments, segCount, stopped);
            this._lastSegCount = segCount;
        } else if (stoppedChanged || !stopped) {
            // Update colors when: stopped state just changed, or simulation is running (ATP changes every step)
            this._updateSegmentColors(cytoplasmSegments, segCount, stopped);
        }
        // else: paused and nothing changed — skip redundant color recalculation

        this._stopped = stopped;

        // Brownian particles move every frame — always update
        const partCount = Math.min(brownianParticles.length, MAX_PARTICLES);
        this.particleMesh.count = partCount;
        this.trueParticleMesh.count = partCount;

        for (let i = 0; i < partCount; i++) {
            const p = brownianParticles[i];
            _dummy.position.set(p.x, p.y, 0);
            _dummy.rotation.set(0, 0, 0);
            _dummy.scale.set(1, 1, 1);
            _dummy.updateMatrix();
            this.particleMesh.setMatrixAt(i, _dummy.matrix);
            this.trueParticleMesh.setMatrixAt(i, _dummy.matrix);
        }
        this.particleMesh.instanceMatrix.needsUpdate = true;
        this.trueParticleMesh.instanceMatrix.needsUpdate = true;


        // TIPOC spheres grow each frame — always update
        let tipocCount = 0;
        for (let i = 0; i < segCount; i++) {
            const seg = cytoplasmSegments[i];
            if (seg.tipocSize > 0 ) {
                const growthDirection = seg.direction;
                const rotationAngle = growthDirection - Math.PI / 2;
                const growthDirectionVector = new THREE.Vector2(Math.cos(growthDirection), Math.sin(growthDirection));
                const dx = growthDirectionVector.x * (Constants.INT_CYTOPLASM_RADIUS - seg.tipocSize*Constants.INT_CYTOPLASM_RADIUS);
                const dy = growthDirectionVector.y * (Constants.INT_CYTOPLASM_RADIUS - seg.tipocSize*Constants.INT_CYTOPLASM_RADIUS);
                _dummy.position.set(seg.x + dx, seg.y + dy, 0);
                _dummy.rotation.set(0, 0, rotationAngle);
                const scale = seg.tipocSize;
                _dummy.scale.set(scale, scale, scale);
                _dummy.updateMatrix();
                this.tipocMesh.setMatrixAt(tipocCount, _dummy.matrix);
                tipocCount++;
            }
        }
        this.tipocMesh.count = tipocCount;
        this.tipocMesh.instanceMatrix.needsUpdate = true;

        // Rebuild segment labels when stopped
        if (stopped && this.labels.length === 0) {
            this._rebuildLabels(cytoplasmSegments, segCount, brownianParticles);
        } else if (!stopped && this.labels.length > 0) {
            this._removeLabels();
        }

        // Show/hide helper axis and grid when stopped
        if (stopped && !this._helpersVisible) {
            this.scene.add(this.helperAxis);
            this.scene.add(this.helperGrid);
            this._helpersVisible = true;
        } else if (!stopped && this._helpersVisible) {
            this.scene.remove(this.helperAxis);
            this.scene.remove(this.helperGrid);
            this._helpersVisible = false;
        }

        // find the tip of the selected branch
        // Find the tip of the selected branch (tipocSize > 0), falling back to the last segment with that hash
        const branchSegments = cytoplasmSegments.slice(0, segCount).filter(seg => seg.branchHash === selectedBranch);
        const selectedSegment = branchSegments.find(seg => seg.tipocSize > 0) ?? branchSegments[branchSegments.length - 1];
        canvas.render(selectedSegment, selectedBranch);
    }




    _rebuildSegmentMatrices(cytoplasmSegments, segCount, stopped) {
        // Pass 1: segment sphere matrices
        for (let i = 0; i < segCount; i++) {
            const seg = cytoplasmSegments[i];
            _dummy.position.set(seg.x, seg.y, 0);
            _dummy.rotation.set(0, 0, seg.direction - Math.PI / 2);
            if (seg.neighbors.length === 2 && seg.tipocSize > 0 || seg.neighbors.length === 3) {
                _dummy.rotation.set(0, 0, seg.direction);
            } 
            _dummy.scale.set(1, 1, 1);
            _dummy.updateMatrix();
            this.segmentMesh.setMatrixAt(i, _dummy.matrix);
            this.intSegmentMesh.setMatrixAt(i, _dummy.matrix);
        }

        // Pass 2: septa ring matrices
        let ringCount = 0;
        for (let i = 0; i < segCount; i++) {
            const seg = cytoplasmSegments[i];
            if (seg.index % (capsulesEvery*5) === 0) {
                if (seg.distanceFromTheTip > Constants.SEGMENT_SPACING * (capsulesEvery / 2 )*35 || seg.index === 0) {
                    _dummy.position.set(seg.x, seg.y, 0);
                    _dummy.scale.set(1, 1, 1);
                    _ringDir.set(Math.cos(seg.direction), Math.sin(seg.direction), 0);
                    _dummy.quaternion.setFromUnitVectors(_zAxis, _ringDir);
                    _dummy.updateMatrix();
                    this.ringMesh.setMatrixAt(ringCount, _dummy.matrix);
                    ringCount++;
                }
            }
        }

        this.segmentMesh.count = segCount;
        this.segmentMesh.instanceMatrix.needsUpdate = true;
        this.intSegmentMesh.count = segCount;
        this.intSegmentMesh.instanceMatrix.needsUpdate = true;
        this.ringMesh.count = ringCount;
        this.ringMesh.instanceMatrix.needsUpdate = true;

        this._applySegmentColors(cytoplasmSegments, segCount, stopped);
    }

    _updateSegmentColors(cytoplasmSegments, segCount, stopped) {
        this._applySegmentColors(cytoplasmSegments, segCount, stopped);
    }

    _applySegmentColors(cytoplasmSegments, segCount, stopped) {
        for (let i = 0; i < segCount; i++) {
            const seg = cytoplasmSegments[i];
            viridisToThreeColor(seg.ATPConcentration, _color);

            let colorBright;
            let colorDim;

            if (stopped) {
                colorBright = grayColor.clone().multiplyScalar(2);
                colorDim = grayColor.clone().multiplyScalar(0.3);
            } else {
                colorBright = _color.clone().multiplyScalar(2);
                colorDim = _color.clone().multiplyScalar(0.5);
            }

            this.segmentMesh.setColorAt(i, colorDim);
            this.intSegmentMesh.setColorAt(i, colorBright);
        }

        if (this.segmentMesh.instanceColor) this.segmentMesh.instanceColor.needsUpdate = true;
        if (this.intSegmentMesh.instanceColor) this.intSegmentMesh.instanceColor.needsUpdate = true;
    }

    _removeLabels() {
        for (const label of this.labels) {
            this.scene.remove(label);
            label.material.map.dispose();
            label.material.dispose();
        }
        this.labels = [];
    }

    _rebuildLabels(cytoplasmSegments, segCount, brownianParticles = []) {
        this._removeLabels();

        // Create new labels
        for (let i = 0; i < segCount; i++) {
            const seg = cytoplasmSegments[i];


            //create a text sprite for the index of the segment///  units in micrometers
            const text = ['bra: ' + seg.branchHash, 'ind: ' + seg.index, 'dft: ' + (seg.distanceFromTheTip/1000).toFixed(2) + ' \u03BCm', 'mac: ' + seg.availableMacromolecules.toFixed(2), 'atp: ' + seg.ATPConcentration.toFixed(2),
                'nof: ' + seg.closestFoci.length
            ];
            const indexSprite = _makeTextSprite(text);
            const rotationAngle = seg.direction - Math.PI / 2;
            let xPos = -Constants.CYTOPLASM_RADIUS * Math.cos(rotationAngle)  + seg.x;
            let yPos = -Constants.CYTOPLASM_RADIUS * Math.sin(rotationAngle) + seg.y;
            // branching points need a different position for the label
            if (seg.neighbors.length === 3 || (seg.neighbors.length === 2 && seg.tipocSize > 0)) {
                xPos = seg.x;//-Constants.CYTOPLASM_RADIUS * Math.cos(rotationAngle + Math.PI / 2)  + seg.x;
                yPos = seg.y;//-Constants.CYTOPLASM_RADIUS * Math.sin(rotationAngle + Math.PI / 2) + seg.y;
            } else if (seg.tipocSize > 0) {
                xPos = seg.x;//-Constants.CYTOPLASM_RADIUS * Math.cos(rotationAngle - Math.PI / 2)  + seg.x;
                yPos = seg.y;//-Constants.CYTOPLASM_RADIUS * Math.sin(rotationAngle - Math.PI / 2) + seg.y;
            }
            
            indexSprite.position.set(seg.x, seg.y, Constants.CYTOPLASM_RADIUS);
          
            
            this.scene.add(indexSprite);
            this.labels.push(indexSprite);
        }

        // Brownian particle labels
        for (const particle of brownianParticles) {
            const text = [
                'bra: ' + (particle.previousSegment ? particle.previousSegment.branchHash : 'none'),
                'ind: ' + (particle.previousSegment ? particle.previousSegment.index : 'none'),
                'x: ' + particle.x.toFixed(1) + ' nm',
                'y: ' + particle.y.toFixed(1) + ' nm',
                'rad: ' + particle.size.toFixed(2) + ' nm',
                
                
            ];
            const particleSprite = _makeTextSprite(text);
            particleSprite.position.set(particle.x, particle.y, -Constants.CYTOPLASM_RADIUS);
            this.scene.add(particleSprite);
            this.labels.push(particleSprite);
        }
    }

    _disposeMeshes(scene) {
        const meshes = ['segmentMesh', 'intSegmentMesh', 'trueParticleMesh', 'particleMesh', 'tipocMesh', 'ringMesh'];
        for (const name of meshes) {
            if (this[name]) {
                scene.remove(this[name]);
                this[name].geometry.dispose();
                this[name].material.dispose();
                this[name] = null;
            }
        }
        // Dispose labels
        for (const label of this.labels) {
            scene.remove(label);
            label.material.map.dispose();
            label.material.dispose();
        }
        this.labels = [];
        // Remove helpers if visible
        if (this._helpersVisible) {
            scene.remove(this.helperAxis);
            scene.remove(this.helperGrid);
            this._helpersVisible = false;
        }
        this._lastSegCount = -1;
        this._stopped = null;
    }
}
