import * as Three from 'three';
import {
    ColladaLoader,
    Collada,
} from 'three/examples/jsm/loaders/ColladaLoader';
import { degToRad } from 'three/src/math/MathUtils';
import proj4 from 'proj4';

/**
 * Calculate aspect ratio from field of view.
 * @param hFov Horizontal field of view in degrees
 * @param vFov Vertical field of view in degrees
 * @returns The aspect ratio
 */
export function aspectRatioFromFov(hFov: number, vFov: number): number {
    hFov = degToRad(hFov);
    vFov = degToRad(vFov);

    const width = Math.tan(hFov / 2.0);
    const height = Math.tan(vFov / 2.0);

    return width / height;
}

/**
 * Create a new empty scene.
 * @returns The scene
 */
export function createEmptyScene(): Three.Scene {
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
export function createPerspectiveCamera(
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
export function createRenderer(cameraAspectRatio: number): Three.WebGLRenderer {
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
export function setDrawingArea(
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
export function fetchImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const loader = new Three.ImageLoader();
        loader.load(
            url,
            (image) => resolve(image),
            (progress) =>
                console.log(`${url} has loaded ${progress.loaded} bytes`),
            (error) => reject(error)
        );
    });
}

/**
 * Async fetch of a collada model.
 * @param url Collada URL.
 * @returns Promise carrying the image.
 */
export function fetchCollada(url: string): Promise<Collada> {
    return new Promise((resolve, reject) => {
        const loader = new ColladaLoader();
        loader.load(
            url,
            (collada) => resolve(collada),
            (progress) =>
                console.log(`${url} has loaded ${progress.loaded} bytes`),
            (error) => reject(error)
        );
    });
}

/**
 * Create a cs converter between UTM and ECEF.
 * @param zone UTM zone number
 * @returns The converter from UTM to ECEF
 */
export function createUtmToEcefConverter(zone: number): proj4.Converter {
    const utm = `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`;
    const ecef = '+proj=geocent +datum=WGS84 +units=m +no_defs';

    return proj4(utm, ecef);
}

/**
 * Rewrite a Collada terrain model. Convert from UTM to ECEF and add
 * surface normals.
 * @param model
 * @param csConv
 * @returns The rewritten model
 */
export function rewriteUTMTerrainModel(
    model: Collada,
    csConv: proj4.Converter
): Three.Group {
    return new Three.Group();
}
