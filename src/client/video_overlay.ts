import * as Three from 'three';

/**
 * The video overlay is a textured full screen quad. It does depth test,
 * and it does not write to the depth buffer.
 */
export class VideoOverlay {
    public constructor() {
        // Create geometry.

        // Vertices: z is always zero. Just omit.
        const positions = new Float32Array([
            // Upper left triangle
            -1.0, -1.0, 0.0,

            1.0, 1.0, 0.0,

            -1.0, 1.0, 0.0,

            // Lower right triangle
            -1.0, -1.0, 0.0,

            1.0, -1.0, 0.0,

            1.0, 1.0, 0.0,
        ]);

        // Texture coordinates.
        const uvs = new Float32Array([
            // Upper left triangle
            0.0, 0.0,

            1.0, 1.0,

            0.0, 1.0,

            // Lower right triangle
            0.0, 0.0,

            1.0, 0.0,

            1.0, 1.0,
        ]);

        const geometry = new Three.BufferGeometry();
        geometry.setAttribute(
            'position',
            new Three.BufferAttribute(positions, 3)
        );
        geometry.setAttribute('uv', new Three.BufferAttribute(uvs, 2));

        // Create texture.
        const texture = new Three.Texture();
        texture.wrapS = Three.ClampToEdgeWrapping;
        texture.wrapT = Three.ClampToEdgeWrapping;
        texture.generateMipmaps = true;
        texture.magFilter = Three.LinearFilter;
        texture.minFilter = Three.LinearMipmapLinearFilter;
        texture.needsUpdate = true;

        // Create material.

        const material = new Three.RawShaderMaterial({
            vertexShader: this._vertexSource,
            fragmentShader: this._fragmentSource,
            depthTest: false,
            depthWrite: false,
            uniforms: {
                uImage: { value: texture },
            },
        });

        this._mesh = new Three.Mesh(geometry, material);
        this._mesh.frustumCulled = false;
    }

    /**
     * Set a new image for the video overlay.
     * @param image The new image.
     */
    public updateTexture(image: HTMLImageElement): void {
        const material = this._mesh.material as Three.RawShaderMaterial;
        material.uniforms.uImage.value.image = image;
        material.uniforms.uImage.value.needsUpdate = true;
    }

    /**
     * Get the mesh
     * @returns The mesh for the video overlay
     */
    public mesh(): Three.Mesh {
        return this._mesh;
    }

    private _mesh: Three.Mesh;

    private readonly _vertexSource = `#version 300 es

layout (location = 0) in vec3 position;
layout (location = 1) in vec2 uv;

out vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}`;

    private readonly _fragmentSource = `#version 300 es

precision highp float;

uniform sampler2D uImage;

in vec2 vUv;
out vec4 color;

void main() {
    color = vec4(texture(uImage, vUv).rgb, 1.0);
}`;
}
