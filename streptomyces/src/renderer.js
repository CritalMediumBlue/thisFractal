import { Constants } from './constants.js';
import { viridisToThreeColor } from './colorScales.js';
import * as THREE from 'three';

const MAX_PARTICLES = 10000;
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export class Renderer {
    constructor() {
        this.segmentMesh = null;
        this.intSegmentMesh = null;
        this.tipSegmentMesh = null;
        this.tipIntSegmentMesh = null;
        this.particleMesh = null;
        this.tipocMesh = null;
        this._lastSegCount = -1;
        this._regularCount = 0;
        this._tipCount = 0;
    }

    init(scene) {
        this._disposeMeshes(scene);

        // Segment spheres
        const segGeo = new THREE.SphereGeometry(Constants.CYTOPLASM_RADIUS, 15, 2, 0, Math.PI * 2.0, Math.PI / 3, Math.PI / 3);
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

        const intSegGeo = new THREE.SphereGeometry(Constants.INT_CYTOPLASM_RADIUS, 15, 2, 0, Math.PI * 2.0, Math.PI / 3, Math.PI / 3);
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

        // Tip segment spheres (wider arc)
        const tipSegGeo = new THREE.SphereGeometry(Constants.CYTOPLASM_RADIUS, 10, 3, 0, Math.PI * 2.0, 0, 2 * Math.PI / 3);
        const tipSegMat = new THREE.MeshBasicMaterial({ vertexColors: false, wireframe: true });
        this.tipSegmentMesh = new THREE.InstancedMesh(tipSegGeo, tipSegMat, Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS);
        this.tipSegmentMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.tipSegmentMesh.instanceColor = new THREE.InstancedBufferAttribute(
            new Float32Array(Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS * 3), 3
        );
        this.tipSegmentMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
        this.tipSegmentMesh.count = 0;
        this.tipSegmentMesh.frustumCulled = false;
        scene.add(this.tipSegmentMesh);

        const tipIntSegGeo = new THREE.SphereGeometry(Constants.INT_CYTOPLASM_RADIUS, 10, 3, 0, Math.PI * 2.0, 0, 2 * Math.PI / 3);
        const tipIntSegMat = new THREE.MeshBasicMaterial({ vertexColors: false, wireframe: true });
        this.tipIntSegmentMesh = new THREE.InstancedMesh(tipIntSegGeo, tipIntSegMat, Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS);
        this.tipIntSegmentMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.tipIntSegmentMesh.instanceColor = new THREE.InstancedBufferAttribute(
            new Float32Array(Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS * 3), 3
        );
        this.tipIntSegmentMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
        this.tipIntSegmentMesh.count = 0;
        this.tipIntSegmentMesh.frustumCulled = false;
        scene.add(this.tipIntSegmentMesh);

        // Particle spheres (smaller, green)
        const partGeo = new THREE.SphereGeometry(Constants.FOCUS_RADIUS, 8, 8);
        const partMat = new THREE.MeshBasicMaterial({ color: 0x66ff66, opacity: 0.5, transparent: true });
        this.particleMesh = new THREE.InstancedMesh(partGeo, partMat, MAX_PARTICLES);
        this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.particleMesh.count = 0;
        this.particleMesh.frustumCulled = false;
        scene.add(this.particleMesh);

        // TIPOC spheres (red)
        const tipocGeo = new THREE.SphereGeometry(Constants.CYTOPLASM_RADIUS, 20, 20, 0, Math.PI * 2.0, 0, Math.PI / 3);
        const tipocMat = new THREE.MeshBasicMaterial({ color: 0xff4444, wireframe: true });
        this.tipocMesh = new THREE.InstancedMesh(tipocGeo, tipocMat, Constants.MAX_NUMBER_OF_CYTOPLASM_SEGMENTS);
        this.tipocMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.tipocMesh.count = 0;
        this.tipocMesh.frustumCulled = false;
        scene.add(this.tipocMesh);
    }

    draw(cytoplasmSegments, brownianParticles, segCount, canvas) {
        const segmentsChanged = segCount !== this._lastSegCount;

        if (segmentsChanged) {
            // Segments were added or reclassified (tip→regular) — rebuild matrices + colors
            this._rebuildSegmentMatrices(cytoplasmSegments, segCount);
            this._lastSegCount = segCount;
        } else {
            // Only ATP concentrations changed — update colors only
            this._updateSegmentColors(cytoplasmSegments, segCount);
        }

        // Brownian particles move every frame — always update
        const partCount = Math.min(brownianParticles.length, MAX_PARTICLES);
        this.particleMesh.count = partCount;

        for (let i = 0; i < partCount; i++) {
            const p = brownianParticles[i];
            _dummy.position.set(p.x, p.y, 0);
            _dummy.rotation.set(0, 0, 0);
            _dummy.scale.set(1, 1, 1);
            _dummy.updateMatrix();
            this.particleMesh.setMatrixAt(i, _dummy.matrix);
        }
        this.particleMesh.instanceMatrix.needsUpdate = true;

        // TIPOC spheres grow each frame — always update
        let tipocCount = 0;
        for (let i = 0; i < segCount; i++) {
            const seg = cytoplasmSegments[i];
            if (seg.tipocSize > 0) {
                const growthDirection = seg.direction;
                const rotationAngle = growthDirection - Math.PI / 2;
                const growthDirectionVector = new THREE.Vector2(Math.cos(growthDirection), Math.sin(growthDirection));
                const dx = growthDirectionVector.x * (Constants.INT_CYTOPLASM_RADIUS - seg.tipocSize*330);
                const dy = growthDirectionVector.y * (Constants.INT_CYTOPLASM_RADIUS - seg.tipocSize*330);
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

        canvas.render();
    }

    _rebuildSegmentMatrices(cytoplasmSegments, segCount) {
        let regularCount = 0;
        let tipCount = 0;

        for (let i = 0; i < segCount; i++) {
            const seg = cytoplasmSegments[i];
            _dummy.position.set(seg.x, seg.y, 0);
            _dummy.rotation.set(0, 0, seg.direction - Math.PI / 2);
            _dummy.scale.set(1, 1, 1);
            _dummy.updateMatrix();
            viridisToThreeColor(seg.ATPConcentration, _color);

            if (seg.tipocSize > 0) {
                this.tipSegmentMesh.setMatrixAt(tipCount, _dummy.matrix);
                this.tipIntSegmentMesh.setMatrixAt(tipCount, _dummy.matrix);
                this.tipSegmentMesh.setColorAt(tipCount, _color);
                _color.multiplyScalar(2);
                this.tipIntSegmentMesh.setColorAt(tipCount, _color);
                tipCount++;
            } else {
                this.segmentMesh.setMatrixAt(regularCount, _dummy.matrix);
                this.intSegmentMesh.setMatrixAt(regularCount, _dummy.matrix);
                this.segmentMesh.setColorAt(regularCount, _color);
                _color.multiplyScalar(2);
                this.intSegmentMesh.setColorAt(regularCount, _color);
                regularCount++;
            }
        }

        this._regularCount = regularCount;
        this._tipCount = tipCount;

        this.segmentMesh.count = regularCount;
        this.segmentMesh.instanceMatrix.needsUpdate = true;
        if (this.segmentMesh.instanceColor) this.segmentMesh.instanceColor.needsUpdate = true;
        this.intSegmentMesh.count = regularCount;
        this.intSegmentMesh.instanceMatrix.needsUpdate = true;
        if (this.intSegmentMesh.instanceColor) this.intSegmentMesh.instanceColor.needsUpdate = true;
        this.tipSegmentMesh.count = tipCount;
        this.tipSegmentMesh.instanceMatrix.needsUpdate = true;
        if (this.tipSegmentMesh.instanceColor) this.tipSegmentMesh.instanceColor.needsUpdate = true;
        this.tipIntSegmentMesh.count = tipCount;
        this.tipIntSegmentMesh.instanceMatrix.needsUpdate = true;
        if (this.tipIntSegmentMesh.instanceColor) this.tipIntSegmentMesh.instanceColor.needsUpdate = true;
    }

    _updateSegmentColors(cytoplasmSegments, segCount) {
        let regularCount = 0;
        let tipCount = 0;

        for (let i = 0; i < segCount; i++) {
            const seg = cytoplasmSegments[i];
            viridisToThreeColor(seg.ATPConcentration, _color);

            if (seg.tipocSize > 0) {
                this.tipSegmentMesh.setColorAt(tipCount, _color);
                _color.multiplyScalar(2);
                this.tipIntSegmentMesh.setColorAt(tipCount, _color);
                tipCount++;
            } else {
                this.segmentMesh.setColorAt(regularCount, _color);
                _color.multiplyScalar(2);
                this.intSegmentMesh.setColorAt(regularCount, _color);
                regularCount++;
            }
        }

        if (this.segmentMesh.instanceColor) this.segmentMesh.instanceColor.needsUpdate = true;
        if (this.intSegmentMesh.instanceColor) this.intSegmentMesh.instanceColor.needsUpdate = true;
        if (this.tipSegmentMesh.instanceColor) this.tipSegmentMesh.instanceColor.needsUpdate = true;
        if (this.tipIntSegmentMesh.instanceColor) this.tipIntSegmentMesh.instanceColor.needsUpdate = true;
    }

    _disposeMeshes(scene) {
        const meshes = ['segmentMesh', 'intSegmentMesh', 'tipSegmentMesh', 'tipIntSegmentMesh', 'particleMesh', 'tipocMesh'];
        for (const name of meshes) {
            if (this[name]) {
                scene.remove(this[name]);
                this[name].geometry.dispose();
                this[name].material.dispose();
                this[name] = null;
            }
        }
    }
}
