import * as Three from 'three';
import Stats from 'three/examples/jsm/libs/stats.module';

import {
    cameraRotationYPR,
    createEmptyScene,
    createPerspectiveCamera,
    createRenderer,
    createUtmToEcefConverter,
    fetchCollada,
    fetchImage,
    fetchRewriteAndLoadColladaTerrainTiles,
    ecefToGLRotation,
    setDrawingArea,
} from './app_util';
import { VideoOverlay } from './video_overlay';

/**
 * Kick-start the application.
 */
window.onload = simplestTerrainDemo;

async function simplestTerrainDemo() {
    try {
        const scene = createEmptyScene();

        const hFov = 40; // Dummy.
        const vFov = 30;
        const camera = createPerspectiveCamera(hFov, vFov);

        const renderer = createRenderer(camera.aspect);
        document.body.append(renderer.domElement);

        // Load data (not checked in).        
        const converter = createUtmToEcefConverter(33);
        const terrainBox = await fetchRewriteAndLoadColladaTerrainTiles(
            ['./content/10/520/10_520_305/10_520_305.dae'],
            converter,
            scene,            
        );        

        //const camPos = new Three.Vector3(3427674.5252427, 939242.8100310, 5280882.1911107);
        const camPos = new Three.Vector3(3427185.2975538, 938976.2685280, 5280812.4649243);
        //const camRot = cameraRotationYPR(-0.9804382, 0.7318679, 2.5203709);
        const camRot = cameraRotationYPR(-0.8009253, 0.6818230, 2.6025103);

        camera.position.set(camPos.x, camPos.y, camPos.z);
        camera.setRotationFromMatrix(camRot);        

        // Tool: Add the statistics widget to the DOM.
        const stats = Stats();
        document.body.appendChild(stats.dom);

        window.onresize = () => {
            setDrawingArea(renderer, camera.aspect);
        }

        renderer.setAnimationLoop(() => {
            camera.updateMatrixWorld();
            renderer.render(scene, camera);

            stats.update();
        });


    } catch (e) {
        document.body.append(document.createTextNode('Oops. Things just broke'));
    }
}

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
        const camera = createPerspectiveCamera(hFov, vFov);
        camera.position.set(0, 0, 5);

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

