import * as Three from 'three';
import Stats from 'three/examples/jsm/libs/stats.module';

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
    fetchJSON,
} from './app_util';
import { VideoOverlay } from './video_overlay';

/**
 * Kick-start the application.
 */
window.onload = simplestTerrainDemo;

function metadataUrl(n: number): string {
    return `./content/demo/meta/${n}.json`;
}

function imageUrl(n: number): string {
    return `./content/demo/images/${n}.png`;
}

async function simplestTerrainDemo() {
    try {
        const scene = createEmptyScene();
        const camera = createPerspectiveCamera();

        // Load initial metadata (not checked in).
        const metadata = await fetchJSON<Metadata>(metadataUrl(0));
        setCameraMetadata(camera, metadata);

        const renderer = createRenderer(camera.aspect);
        document.body.append(renderer.domElement);

        // Load terrain data (not checked in).
        const converter = createUtmToEcefConverter(33);
        const terrainBox = await fetchRewriteAndLoadColladaTerrainTiles(
            [
                './content/demo/tiles/10/520/10_520_305/10_520_305.dae',
                './content/demo/tiles/10/520/10_520_306/10_520_306.dae',
                './content/demo/tiles/10/520/10_520_307/10_520_307.dae',
            ],
            converter,
            scene
        );

        // Load initial image (not checked in).
        const image = await fetchImage(imageUrl(0));
        const videoOverlay = new VideoOverlay();
        videoOverlay.updateTexture(image);
        videoOverlay.mesh().visible = true;
        scene.add(videoOverlay.mesh());

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
        var currentItem = 0;
        const minItem = 0;
        const maxItem = 2;
        window.onkeydown = async (event: KeyboardEvent) => {
            if (event.code == 'KeyN') {
                showNormal = !showNormal;
            } else if (event.code == 'KeyI') {
                videoOverlay.mesh().visible = !videoOverlay.mesh().visible;
            } else if (
                event.code == 'ArrowLeft' ||
                event.code == 'ArrowRight'
            ) {
                currentItem =
                    event.code == 'ArrowLeft'
                        ? Math.max(currentItem - 1, minItem)
                        : Math.min(currentItem + 1, maxItem);
                const metadata = await fetchJSON<Metadata>(
                    metadataUrl(currentItem)
                );
                setCameraMetadata(camera, metadata);
                setDrawingArea(renderer, camera.aspect);
                const image = await fetchImage(imageUrl(currentItem));
                videoOverlay.updateTexture(image);
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
                    normalArrow.renderOrder = 2;
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
            renderer.render(scene, camera);

            stats.update();
        });
    } catch (e) {
        document.body.append(
            document.createTextNode('Oops. Things just broke')
        );
    }
}
