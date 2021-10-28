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

/**
 * Kick-start the application.
 */
window.onload = simplestDemo;

/**
 * A real simple demo app just to see that things are working.
 */
async function simplestDemo() {
    try {
        // Create CS converter.
        const csConv = createUtmToEcefConverter(33);

        // Temporary: fetch an image at the beginning.
        const image = await fetchImage('content/montreal.jpg');

        // Fetch model(s).
        const model = await fetchCollada('./content/collada/Gun.dae');

        // Hard coded values for now.
        const hFov = 60;
        const vFov = 45;

        // Create scene.
        const scene = createEmptyScene();

        // Create camera.
        const camera = createPerspectiveCamera(
            new Three.Vector3(0, 0, 5),
            new Three.Vector3(0, 0, 0),
            hFov,
            vFov
        );

        // Create renderer.
        const renderer = createRenderer(camera.aspect);

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
        const videoOverlay = new VideoOverlay();
        videoOverlay.updateTexture(image);
        scene.add(videoOverlay.mesh());

        // Tool: Add the statistics widget to the DOM.
        const stats = Stats();
        document.body.appendChild(stats.dom);

        window.onresize = () => {
            console.log('size');
            setDrawingArea(renderer, camera.aspect);
        };

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
}
