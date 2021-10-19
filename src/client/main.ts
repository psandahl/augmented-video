import * as Three from 'three';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader';
import Stats from 'three/examples/jsm/libs/stats.module';

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
    // Temporary: fetch an image at the beginning.
    const image = await fetchImage('content/montreal.jpg');

    // Hard coded values for now.
    const hFov = 60;
    const vFov = 45;

    // Create scene.
    scene = createEmptyScene();

    // Create camera.
    camera = createPerspectiveCamera(
        new Three.Vector3(0, 0, -1),
        new Three.Vector3(0, 0, 0),
        hFov,
        vFov,
    );

    // Create renderer.
    renderer = createRenderer(camera.aspect);

    // Add the renderer canvas to the DOM.
    document.body.append(renderer.domElement);

    // Some experimental stuff with Collada.
    const colladaLoader = new ColladaLoader();
    colladaLoader.load(
        './content/collada/Gun.dae',
        (model) => {

            model.scene.position.set(0, 0, -5);
            scene.add(model.scene);

            // Add some lights.
            const ambientLight = new Three.AmbientLight(
                new Three.Color(1.0, 1.0, 1.0),
                0.5
            );
            scene.add(ambientLight);

            const spotLight = new Three.SpotLight(
                new Three.Color(1.0, 1.0, 1.0)
            );
            spotLight.position.set(10, 10, 10);
            scene.add(spotLight);
        },
        (error) => {
            console.warn(error);
        }
    );

    // Create the video overlay.
    //videoOverlay = new VideoOverlay();
    //videoOverlay.updateTexture(image);
    //scene.add(videoOverlay.mesh());

    // Tool: Add the statistics widget to the DOM.
    stats = Stats();
    document.body.appendChild(stats.dom);

    // Run the rendering loop.
    renderer.setAnimationLoop(() => {
        camera.updateMatrixWorld();
        renderer.render(scene, camera);

        stats.update();        
    });
};

/**
 * Act on resize events.
 */
window.onresize = () => {
    setDrawingArea(renderer, camera.aspect);
};

/**
 * Convert from degrees to radians.
 * @param deg The angle in degrees
 * @returns The angle in radians
 */
function toRadians(deg: number): number {
    return deg * (Math.PI / 180.0);
}

/**
 * Convert from radians to degrees.
 * @param rad The angle in radians
 * @returns The angle in degrees
 */
function toDegrees(rad: number): number {
    return rad / (Math.PI / 180.0);
}

/**
 * Calculate aspect ratio from field of view.
 * @param hFov Horizontal field of view in degrees
 * @param vFov Vertical field of view in degrees
 * @returns The aspect ratio
 */
function aspectRatioFromFov(hFov: number, vFov: number): number {
    hFov = toRadians(hFov);
    vFov = toRadians(vFov);

    const width = Math.tan(hFov / 2.0);
    const height = Math.tan(vFov / 2.0);

    return width / height;
}

/**
 * Create a new empty scene.
 * @returns The scene
 */
function createEmptyScene(): Three.Scene {
    return new Three.Scene();
}

/**
 * Create a new perspective camera which is bound to its specified
 * specification rather than the canvas' dimension.
 * @param position Position of the camera
 * @param rotation Rotation of the camera in degrees
 * @param hFov Horizontal field of view in degrees
 * @param vFov Vertical field of view in degrees
 * @returns The camera
 */
function createPerspectiveCamera(
    position: Three.Vector3,
    rotation: Three.Vector3,
    hFov: number,
    vFov: number    
): Three.PerspectiveCamera {
    const aspectRatio = aspectRatioFromFov(hFov, vFov);
    const camera = new Three.PerspectiveCamera(vFov, aspectRatio, 1.0, 4000.0);
    camera.position.set(position.x, position.y, position.z);
    camera.rotation.set(rotation.x, rotation.y, rotation.z);

    return camera;
}

/**
 * Create a renderer.
 * @param cameraAspectRatio Aspect ratio for the camera
 * @returns The renderer.
 */
function createRenderer(cameraAspectRatio: number): Three.WebGLRenderer {
    const renderer = new Three.WebGLRenderer({ antialias: true });
    renderer.setScissorTest(true);    
    renderer.setClearColor(new Three.Color(0.0, 0.0, 0.2));    
    renderer.domElement.tabIndex = 1;

    setDrawingArea(renderer, cameraAspectRatio);

    return renderer;
}

/**
 * Resize the renderer
 * @param renderer The renderer
 * @param cameraAspectRatio Aspect ratio for the camera
 */
function setDrawingArea(
    renderer: Three.WebGLRenderer,    
    cameraAspectRatio: number
): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);

    const canvasAspectRatio = width / height;
    if (cameraAspectRatio > canvasAspectRatio) {
        // The camera view is wider than the canvas, keep the width but
        // adjust the height.
        const adjHeight = width * (1.0 / cameraAspectRatio);
        const diff = height - adjHeight;

        renderer.setViewport(0, diff / 2, width, adjHeight);
        renderer.setScissor(0, diff / 2, width, adjHeight);
    } else {
        // The video is equal or taller than the device. Keep the height
        // but adjust the width.
        const adjWidth = height * cameraAspectRatio;
        const diff = width - adjWidth;

        renderer.setViewport(diff / 2, 0, adjWidth, height);
        renderer.setScissor(diff / 2, 0, adjWidth, height);
    }
}

/**
 * Async fetch of an image.
 * @param url Image URL
 * @returns Promise carrying the image
 */
function fetchImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const loader = new Three.ImageLoader();
        loader.load(
            url,
            (image) => resolve(image),
            (error) => reject(error)
        );
    });
}
