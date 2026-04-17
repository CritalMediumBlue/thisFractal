import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Constants } from './constants.js';

export class Canvas {
    constructor() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x505050);

        // Camera — position above the simulation starting area
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(60, aspect, 1000, 500000);
        this.fog = new THREE.Fog(0x111111, 2, 100000);
        this.scene.fog = this.fog;

        // Spore starts near (250, 78); hyphae grow outward from there
        const cx = 0;
        const cy = 0;
        this.camera.position.set(cx, cy, 10000);
        this.camera.lookAt(cx, cy, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);

        // Expose domElement so existing code that reads `this.canvas.canvas` still works
        this.canvas = this.renderer.domElement;

        // OrbitControls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(cx, cy, 0);
        this.controls.enableDamping = false;
        this.controls.update();

        // Resize handler
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    render() {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}