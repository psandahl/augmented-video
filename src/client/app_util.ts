import * as Three from 'three';
import {
    ColladaLoader,
    Collada,
} from 'three/examples/jsm/loaders/ColladaLoader';
import { degToRad } from 'three/src/math/MathUtils';
import proj4 from 'proj4';

/**
 * Camera metadata. All angles are in degrees.
 */
export interface Metadata {
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
    roll: number;
    hfov: number;
    vfov: number;
}

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
 * Create a quaternion that represents a rotation from the ECEF frame
 * to the OpenGL frame.
 * @returns The quaternion
 */
export function ecefToGLRotation(): Three.Quaternion {
    const euler = new Three.Euler(degToRad(-90.0), degToRad(-90.0), 0.0, 'YXZ');
    return new Three.Quaternion().setFromEuler(euler);
}

/**
 * Create a new perspective camera which is bound to its specified
 * field of view specification rather than a canvas size.
 * @returns The camera
 */
export function createPerspectiveCamera(): Three.PerspectiveCamera {
    return new Three.PerspectiveCamera(45, 1.0, 1.0, 10000.0);
}

/**
 * Update the camera with new metadata
 * @param camera The camera to update
 * @param metadata The metadata
 */
export function setCameraMetadata(
    camera: Three.PerspectiveCamera,
    metadata: Metadata,
    toEcef: boolean = true
): void {
    camera.position.set(metadata.x, metadata.y, metadata.z);
    const camRot = cameraRotationYPR(
        degToRad(metadata.yaw),
        degToRad(metadata.pitch),
        degToRad(metadata.roll),
        toEcef
    );
    camera.setRotationFromMatrix(camRot);
    camera.fov = metadata.vfov;
    camera.aspect = aspectRatioFromFov(metadata.hfov, metadata.vfov);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
}

/**
 * Create a renderer.
 * @param cameraAspectRatio Aspect ratio for the camera
 * @returns The renderer.
 */
export function createRenderer(cameraAspectRatio: number): Three.WebGLRenderer {
    const renderer = new Three.WebGLRenderer({
        antialias: true,
        logarithmicDepthBuffer: true,
        precision: 'highp',
    });
    renderer.setScissorTest(true);
    renderer.setClearColor(new Three.Color(0.0, 0.0, 0.2));
    renderer.domElement.tabIndex = 1;

    setDrawingArea(renderer, cameraAspectRatio);

    return renderer;
}

/**
 * Check if a coordinate is within NDC area.
 * @param coord A NDC coordinate.
 * @returns True if coordinate is within [-1, 1]
 */
export function withinDrawingNDC(coord: Three.Vector2): boolean {
    return (
        coord.x >= -1.0 && coord.x <= 1.0 && coord.y >= -1.0 && coord.y <= 1.0
    );
}

/**
 * Calculate the drawing area within the canvas area
 * @param cameraAspectRatio The camera's aspect ratio
 * @returns The drawing area [x, y, width, height]
 */
export function calcDrawingArea(
    cameraAspectRatio: number
): [number, number, number, number] {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const canvasAspectRatio = width / height;

    if (cameraAspectRatio > canvasAspectRatio) {
        // The camera view is wider than the canvas, keep the width but
        // adjust the height.
        const adjHeight = width * (1.0 / cameraAspectRatio);
        const diff = height - adjHeight;
        return [0, diff / 2, width, adjHeight];
    } else {
        // The video is equal or taller than the device. Keep the height
        // but adjust the width.
        const adjWidth = height * cameraAspectRatio;
        const diff = width - adjWidth;
        return [diff / 2, 0, adjWidth, height];
    }
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

    const drawingArea = calcDrawingArea(cameraAspectRatio);
    renderer.setViewport(
        drawingArea[0],
        drawingArea[1],
        drawingArea[2],
        drawingArea[3]
    );
    renderer.setScissor(
        drawingArea[0],
        drawingArea[1],
        drawingArea[2],
        drawingArea[3]
    );
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
 * Async fetch and decode a JSON object.
 * @param url JSON url
 * @returns Promise with decoded object
 */
export async function fetchJSON<T>(url: string): Promise<T> {
    const response = await fetch(url);
    const body = await response.json();
    return body;
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
 * vertex normals.
 * @param model
 * @param csConv
 * @returns The rewritten model
 */
export function rewriteUTMTerrainModel(
    model: Collada,
    csConv: proj4.Converter
): Three.Group {
    const group = new Three.Group();
    const material = new Three.MeshBasicMaterial({
        color: 0xff0000,
        wireframe: true,
    });

    model.scene.traverse((child) => {
        if (child instanceof Three.Mesh) {
            const childMesh = child as Three.Mesh;
            childMesh.updateMatrixWorld();
            if (
                childMesh.geometry.hasAttribute('position') &&
                childMesh.geometry.getAttribute('position').itemSize == 3 &&
                !childMesh.geometry.index
            ) {
                // Get the positions for the current child.
                const childPositions =
                    childMesh.geometry.getAttribute('position');

                // Create a new attribute array.
                const positions = new Three.BufferAttribute(
                    new Float32Array(childPositions.array.length),
                    3
                );

                // Populate the new array with coverted positions.
                for (let i = 0; i < childPositions.count; ++i) {
                    const x = childPositions.getX(i);
                    const y = childPositions.getY(i);
                    const z = childPositions.getZ(i);

                    // Transform the coordinate to world space.
                    const pos = childMesh.localToWorld(
                        new Three.Vector3(x, y, z)
                    );

                    // Transform using the coordinate transform.
                    const [xx, yy, zz] = csConv.forward([pos.x, pos.y, pos.z]);
                    positions.setXYZ(i, xx, yy, zz);
                }

                // Create mesh and add to the group.
                const geometry = new Three.BufferGeometry();
                geometry.setAttribute('position', positions);

                // Add vertex normals and bounding box.
                geometry.computeVertexNormals();
                geometry.computeBoundingBox();

                group.add(new Three.Mesh(geometry, material));
            } else {
                console.warn(
                    'Only supporting non indexed models with position'
                );
            }
        }
    });

    return group;
}

/**
 * Do everything needed to load a bunch of terrain tiles.
 * @param urls Urls to models
 * @param csConv The converter
 * @param scene The scene
 * @param rotations Rotations of the loaded tiles.
 * @param visualizeBoxes Flag to add visualization of tiles
 * @returns The bounding box for the loaded data.
 */
export async function fetchRewriteAndLoadColladaTerrainTiles(
    urls: string[],
    csConv: proj4.Converter,
    scene: Three.Scene,
    rotations: Three.Quaternion = new Three.Quaternion()
): Promise<Three.Box3> {
    const bBox = new Three.Box3();
    for (let i = 0; i < urls.length; ++i) {
        const origModel = await fetchCollada(urls[i]);
        const adjModel = rewriteUTMTerrainModel(origModel, csConv);
        adjModel.setRotationFromQuaternion(rotations);
        scene.add(adjModel);
        bBox.expandByObject(adjModel);
    }

    return bBox;
}

/**
 * Create a YPR matrix for the ECEF frame (x will point forward).
 * @param yaw Yaw angle
 * @param pitch Pitch angle
 * @param roll Roll angle
 * @returns The matrix
 */
export function matrixYPR(
    yaw: number,
    pitch: number,
    roll: number
): Three.Matrix4 {
    const sy = Math.sin(yaw);
    const cy = Math.cos(yaw);
    const sp = Math.sin(pitch);
    const cp = Math.cos(pitch);
    const sr = Math.sin(roll);
    const cr = Math.cos(roll);

    const matrix = new Three.Matrix4();
    matrix.set(
        cy * cp,
        cy * sp * sr - sy * cr,
        cy * sp * cr + sy * sr,
        0.0,
        sy * cp,
        sy * sp * sr + cy * cr,
        sy * sp * cr - cy * sr,
        0.0,
        -sp,
        cp * sr,
        cp * cr,
        0.0,
        0.0,
        0.0,
        0.0,
        1.0
    );

    return matrix;
}

/**
 * Create an adapted camera rotation matrix for the OpenGL camera
 * (negative z point forward).
 * @param yaw Yaw angle
 * @param pitch Pitch angle
 * @param roll Roll angle
 * @returns The matrix
 */
export function cameraRotationYPR(
    yaw: number,
    pitch: number,
    roll: number,
    toEcef: boolean
): Three.Matrix4 {
    if (toEcef) {
        const permute = new Three.Matrix4().makeRotationZ(Math.PI / 2.0);
        permute.multiply(new Three.Matrix4().makeRotationX(-Math.PI / 2.0));

        return matrixYPR(yaw, pitch, roll).multiply(permute);
    } else {
        return matrixYPR(yaw, pitch, roll);
    }
}
