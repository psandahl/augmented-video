import * as Three from 'three';
import { degToRad } from 'three/src/math/MathUtils';
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
    return `./content/demo1/meta/${n}.json`;
}

function imageUrl(n: number): string {
    return `./content/demo1/images/${n}.png`;
}

async function simplestTerrainDemo() {
    try {
        const scene = createEmptyScene();
        const camera = createPerspectiveCamera();

        // Elf model for silly fun.
        const elf = await fetchCollada('./content/collada/elf.dae');

        // Load initial metadata (not checked in).
        const metadata = await fetchJSON<Metadata>(metadataUrl(0));
        setCameraMetadata(camera, metadata);

        const renderer = createRenderer(camera.aspect);
        document.body.append(renderer.domElement);

        // Load terrain data (not checked in).
        const converter = createUtmToEcefConverter(10);
        const [terrainBox, terrain] =
            await fetchRewriteAndLoadColladaTerrainTiles(
                [
                    './content/demo1/tiles/13/4195/13_4195_4757/13_4195_4757.dae',
                    './content/demo1/tiles/13/4195/13_4195_4758/13_4195_4758.dae',
                    './content/demo1/tiles/13/4196/13_4196_4757/13_4196_4757.dae',
                    './content/demo1/tiles/13/4196/13_4196_4758/13_4196_4758.dae',
                ],
                converter
            );
        terrain.forEach((tile) => {
            scene.add(tile);
        });

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

        var mouseClicked = false;
        window.onmousedown = (event: MouseEvent) => {
            if (event.button == 1) {
                mouseClicked = true;
            }
        };

        // Callback to react on resize events.
        window.onresize = () => {
            setDrawingArea(renderer, camera.aspect);
        };

        // Callback to react on keyboard press.
        const ambientLight = new Three.AmbientLight(0xcccccc, 0.4);
        scene.add(ambientLight);
        const spotLight = new Three.SpotLight(0xffffff, 0.8);
        spotLight.position.set(
            camera.position.x,
            camera.position.y,
            camera.position.z
        );
        scene.add(spotLight);

        var showNormal = false;
        var showCoord = false;
        var currentItem = 0;
        const minItem = 0;
        const maxItem = 8;
        const elfs: Three.Object3D[] = [];
        window.onkeydown = async (event: KeyboardEvent) => {
            if (event.code == 'KeyN') {
                showNormal = !showNormal;
            } else if (event.code == 'KeyT') {
                showCoord = !showCoord;
            } else if (event.code == 'KeyO') {
                videoOverlay.mesh().visible = !videoOverlay.mesh().visible;
            } else if (event.code == 'Escape') {
                elfs.forEach((elf) => {
                    elf.removeFromParent();
                });
                elfs.length = 0;
            } else if (event.code == 'KeyW') {
                terrain.forEach((tile) => {
                    tile.children.forEach((child) => {
                        if (child instanceof Three.Mesh) {
                            const mat = (child as Three.Mesh)
                                .material as Three.MeshBasicMaterial;
                            mat.wireframe = !mat.wireframe;
                            mat.needsUpdate = true;
                        }
                    });
                });
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
                spotLight.position.set(
                    camera.position.x,
                    camera.position.y,
                    camera.position.z
                );
            }
        };

        // Setup stuff for raycasting the scene.
        const raycaster = new Three.Raycaster();
        const normalArrow = new Three.ArrowHelper();
        normalArrow.visible = false;
        scene.add(normalArrow);

        // The render loop.
        renderer.setAnimationLoop(() => {
            const coordDisplay = document.getElementById(
                'coordinates'
            ) as HTMLDivElement;
            coordDisplay.innerText = '';
            normalArrow.visible = false;

            if (
                (mouseClicked || showCoord || showNormal) &&
                withinDrawingNDC(mousePos)
            ) {
                raycaster.setFromCamera(mousePos, camera);
                const intersects = raycaster.intersectObjects(scene.children);
                if (intersects.length > 0 && intersects[0].face) {
                    const point = intersects[0].point;

                    if (mouseClicked) {
                        const model = elf.scene.clone();
                        model.scale.set(5, 5, 5);
                        const pos = point
                            .clone()
                            .addScaledVector(intersects[0].face.normal, 8);
                        model.position.set(point.x, point.y, point.z);

                        // Ouch ...
                        const atPosition = point
                            .clone()
                            .addScaledVector(intersects[0].face.normal, 1000);

                        model.lookAt(atPosition);

                        model.renderOrder = 2;
                        elfs.push(model);
                        scene.add(model);
                    }

                    if (showCoord) {
                        const coordText = `x: ${point.x} y: ${point.y} z: ${point.z} dist: ${intersects[0].distance}m`;
                        coordDisplay.innerText = coordText;
                    }

                    if (showNormal) {
                        normalArrow.position.set(point.x, point.y, point.z);
                        normalArrow.setDirection(intersects[0].face.normal);
                        const len =
                            Math.tan(degToRad(camera.fov) / 2.0) *
                            intersects[0].distance *
                            0.5;
                        normalArrow.setLength(len, len * 0.35, len * 0.15);
                        normalArrow.visible = true;
                    }
                }
            }

            // Rotate all elfs.
            elfs.forEach((elf) => {
                elf.rotateZ(0.05);
            });

            // Always reset mouseClick.
            mouseClicked = false;

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
