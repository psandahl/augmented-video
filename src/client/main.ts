import * as Three from 'three';
import { Color } from 'three';
import Stats from 'three/examples/jsm/libs/stats.module';
import { radToDeg } from 'three/src/math/MathUtils';

import {
    Metadata,
    calcDrawingArea,
    cameraRotationYPR,
    createEmptyScene,
    createPerspectiveCamera,
    createRenderer,
    createUtmToEcefConverter,
    fetchCollada,
    fetchImage,
    fetchRewriteAndLoadColladaTerrainTiles,
    setCameraMetadata,
    setDrawingArea,
    withinDrawingNDC,
} from './app_util';
import { VideoOverlay } from './video_overlay';

/**
 * Kick-start the application.
 */
window.onload = simplestTerrainDemo;

async function simplestTerrainDemo() {
    try {
        const scene = createEmptyScene();
        const camera = createPerspectiveCamera();

        const metadata: Metadata = {
            x: 3427185.2975538,
            y: 938976.268528,
            z: 5280812.4649243,
            yaw: radToDeg(-0.8009253),
            pitch: radToDeg(0.681823),
            roll: radToDeg(2.6025103),
            hfov: 40,
            vfov: 30,
        };
        setCameraMetadata(camera, metadata);

        const renderer = createRenderer(camera.aspect);
        document.body.append(renderer.domElement);

        // Load data (not checked in).
        const converter = createUtmToEcefConverter(33);
        const terrainBox = await fetchRewriteAndLoadColladaTerrainTiles(
            ['./content/demo/tiles/10/520/10_520_305/10_520_305.dae'],
            converter,
            scene
        );

        // Tool: Add the statistics widget to the DOM.
        const stats = Stats();
        document.body.appendChild(stats.dom);

        // Callback to track the mouse position as NDC.
        const mousePos = new Three.Vector2();
        window.onmousemove = (event: MouseEvent) => {
            // Calculate NDC coordinates for the drawing area.
            const drawingArea = calcDrawingArea(camera.aspect);
            const u =
                event.clientX / drawingArea[2] -
                drawingArea[0] / drawingArea[2];
            const v =
                event.clientY / drawingArea[3] -
                drawingArea[1] / drawingArea[3];

            mousePos.x = u * 2 - 1;
            mousePos.y = -v * 2 + 1;
        };

        // Callback to react on resize events.
        window.onresize = () => {
            setDrawingArea(renderer, camera.aspect);
        };

        // Callback to react on keyboard press.
        var showNormal = false;
        window.onkeydown = (event: KeyboardEvent) => {
            if (event.code == 'KeyN') {
                showNormal = !showNormal;
            }
        };

        // Setup stuff for raycasting the scene.
        const raycaster = new Three.Raycaster();
        const normalArrow = new Three.ArrowHelper();
        normalArrow.visible = false;
        scene.add(normalArrow);

        // The render loop.
        renderer.setAnimationLoop(() => {
            if (withinDrawingNDC(mousePos)) {
                raycaster.setFromCamera(mousePos, camera);
                const intersects = raycaster.intersectObjects(scene.children);
                if (showNormal && intersects.length > 0 && intersects[0].face) {
                    const point = intersects[0].point;
                    normalArrow.position.set(point.x, point.y, point.z);
                    normalArrow.setDirection(intersects[0].face.normal);
                    normalArrow.setLength(100, 35, 15);

                    normalArrow.visible = true;
                } else {
                    normalArrow.visible = false;
                }
            } else {
                normalArrow.visible = false;
            }

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

        // Create scene.
        const scene = createEmptyScene();

        // Create camera.
        const camera = createPerspectiveCamera();

        const metadata: Metadata = {
            x: 0,
            y: 0,
            z: 5,
            yaw: 0,
            pitch: 0,
            roll: 0,
            hfov: 60,
            vfov: 45,
        };

        setCameraMetadata(camera, metadata, false);
        console.log(camera.aspect);

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
