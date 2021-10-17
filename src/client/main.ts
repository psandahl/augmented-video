import * as Three from 'three';
import { ImageLoader } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'three/examples/jsm/libs/stats.module';

import { VideoOverlay } from './video_overlay';

let scene: Three.Scene;
let camera: Three.PerspectiveCamera;
let renderer: Three.WebGLRenderer;
let videoOverlay: VideoOverlay;
let stats: Stats;
let mouse: OrbitControls;

/**
 * Kick-start the application.
 */
window.onload = async () => {
    // Temporary: fetch an image at the beginning.
    const image = await fetchImage('content/montreal.jpg');
    const imageAspectRatio = image.naturalWidth / image.naturalHeight;

    const hFov = 60;
    const vFov = 45;
    const cameraAspectRatio = aspectRatioFromFov(hFov, vFov);

    // Create scene.
    scene = createEmptyScene();

    // Create camera.
    camera = createPerspectiveCamera(
        new Three.Vector3(0, 0, 0),
        new Three.Vector3(0, 0, 0),
        vFov,
        cameraAspectRatio
    );

    // Create renderer.
    renderer = createRenderer(
        window.innerWidth,
        window.innerHeight,
        imageAspectRatio,
        window.devicePixelRatio
    );

    // Add the renderer canvas to the DOM.
    document.body.append(renderer.domElement);

    // Create the video overlay.
    videoOverlay = new VideoOverlay();
    videoOverlay.updateTexture(image);
    scene.add(videoOverlay.mesh());

    // Tool: Add the statistics widget to the DOM.
    stats = Stats();
    document.body.appendChild(stats.dom);

    // Tool: Add mouse controls.
    mouse = createMouseControl(camera, renderer.domElement);

    // Run the rendering loop.
    renderer.setAnimationLoop(() => {
        camera.updateMatrixWorld();
        renderer.render(scene, camera);

        stats.update();
        mouse.update();
    });
};

/**
 * Act on resize events.
 */
window.onresize = () => {
    resizeRenderer(
        renderer,
        window.innerWidth,
        window.innerHeight,
        camera.aspect
    );
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
 * Create a new perspective camera.
 * @param position Position of the camera
 * @param rotation Rotation of the camera in degrees
 * @param vFov Vertical field of view in degrees
 * @param aspectRatio Aspect ratio
 */
function createPerspectiveCamera(
    position: Three.Vector3,
    rotation: Three.Vector3,
    vFov: number,
    aspectRatio: number
): Three.PerspectiveCamera {
    const camera = new Three.PerspectiveCamera(vFov, aspectRatio, 1.0, 4000.0);
    camera.position.set(position.x, position.y, position.z);
    camera.rotation.set(rotation.x, rotation.y, rotation.z);

    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();

    return camera;
}

/**
 * Create a renderer.
 * @param width Width of the canvas
 * @param height Height of the canvas
 * @param cameraAspectRatio Aspect ratio for the camera
 * @param pixelRatio The device pixel ratio
 * @returns The renderer.
 */
function createRenderer(
    width: number,
    height: number,
    cameraAspectRatio: number,
    pixelRatio: number
): Three.WebGLRenderer {
    const renderer = new Three.WebGLRenderer({ antialias: true });
    renderer.setScissorTest(true);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(new Three.Color(0.0, 0.0, 1.0));
    resizeRenderer(renderer, width, height, cameraAspectRatio);
    renderer.domElement.tabIndex = 1;

    return renderer;
}

/**
 * Resize the renderer
 * @param renderer The renderer
 * @param width Width of the canvas
 * @param height Height of the canvas
 * @param cameraAspectRatio Aspect ratio for the camera
 */
function resizeRenderer(
    renderer: Three.WebGLRenderer,
    width: number,
    height: number,
    cameraAspectRatio: number
): void {
    renderer.setSize(width, height);
    renderer.setViewport(0, 0, width, height);

    const canvasAspectRatio = width / height;
    if (cameraAspectRatio > canvasAspectRatio) {
        // The video is wider than the device. Setup a scissor area with
        // adapted height.
        const videoHeight = width * (1.0 / cameraAspectRatio);
        const heightDiff = height - videoHeight;

        renderer.setScissor(0, heightDiff / 2, width, videoHeight);
    } else {
        // The video is equal or taller than the device. Setup a
        // scissor area with adapted width.
        const videoWidth = height * cameraAspectRatio;
        const widthDiff = width - videoWidth;

        renderer.setScissor(widthDiff / 2, 0, videoWidth, height);
    }
}

/**
 * Create a mouse control.
 * @param camera The camera to manipulate
 * @param canvas The canvas to track events on
 * @returns The mouse control
 */
function createMouseControl(
    camera: Three.Camera,
    canvas: HTMLElement
): OrbitControls {
    const controls = new OrbitControls(camera, canvas);
    controls.screenSpacePanning = false;
    controls.minDistance = 1.0;
    controls.maxDistance = 2000.0;
    controls.maxPolarAngle = Math.PI / 2.0;

    return controls;
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
