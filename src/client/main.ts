import * as Three from 'three';
import Stats from 'three/examples/jsm/libs/stats.module';

import {
    createEmptyScene,
    createPerspectiveCamera,
    createRenderer,
    createUtmToEcefConverter,
    fetchCollada,
    fetchImage,
    setDrawingArea,
} from './app_util';
import { VideoOverlay } from './video_overlay';

let scene: Three.Scene;
let camera: Three.PerspectiveCamera;
let renderer: Three.WebGLRenderer;
let videoOverlay: VideoOverlay;
let stats: Stats;

/**
 * Kick-start the application.
 */
window.onload = async () => {
    try {
        // Create CS converter.
        const csConv = createUtmToEcefConverter(33);
        console.log(csConv.forward([500000.0, 4649776.22, 100.0]));

        // Temporary: fetch an image at the beginning.
        const image = await fetchImage('content/montreal.jpg');

        // Fetch model(s).
        const model = await fetchCollada('./content/collada/Gun.dae');

        // Hard coded values for now.
        const hFov = 60;
        const vFov = 45;

        // Create scene.
        scene = createEmptyScene();

        // Create camera.
        camera = createPerspectiveCamera(
            new Three.Vector3(0, 0, 5),
            new Three.Vector3(0, 0, 0),
            hFov,
            vFov
        );

        // Create renderer.
        renderer = createRenderer(camera.aspect);

        // Add the renderer canvas to the DOM.
        document.body.append(renderer.domElement);

        // Add the model.
        scene.add(model.scene);

        // Add some lights.
        const ambientLight = new Three.AmbientLight(
            new Three.Color(1.0, 1.0, 1.0),
            0.5
        );
        scene.add(ambientLight);

        const spotLight = new Three.SpotLight(new Three.Color(1.0, 1.0, 1.0));
        spotLight.position.set(10, 10, 10);
        scene.add(spotLight);

        // Create the video overlay.
        videoOverlay = new VideoOverlay();
        videoOverlay.updateTexture(image);
        scene.add(videoOverlay.mesh());

        // Tool: Add the statistics widget to the DOM.
        stats = Stats();
        document.body.appendChild(stats.dom);

        // Run the rendering loop.
        renderer.setAnimationLoop(() => {
            camera.updateMatrixWorld();
            renderer.render(scene, camera);

            stats.update();
        });
    } catch (e) {
        document.body.append(
            document.createTextNode('Oops. Things just broke')
        );
    }
};

/**
 * Act on resize events.
 */
window.onresize = () => {
    setDrawingArea(renderer, camera.aspect);
};
