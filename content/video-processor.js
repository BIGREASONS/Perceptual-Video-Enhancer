// Video Processor - WebGL rendering pipeline for video enhancement
// Applies shader chain based on active preset

class VideoProcessor {
    constructor(video, options = {}) {
        this.video = video;
        this.options = options;
        this.canvas = null;
        this.gl = null;
        this.program = null;
        this.texture = null;
        this.animationId = null;
        this.isProcessing = false;
        this.preset = options.preset || {
            debanding: 0.5,
            smoothing: 0.3,
            sharpening: 0.15
        };
    }

    /**
     * Initialize WebGL context and shaders
     */
    async init() {
        // Create overlay canvas
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'video-enhance-overlay';
        this.canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
    `;

        // Position canvas over video
        this.positionCanvas();

        // Get WebGL context
        this.gl = this.canvas.getContext('webgl', {
            alpha: false,
            antialias: false,
            depth: false,
            preserveDrawingBuffer: false,
            premultipliedAlpha: false
        });

        if (!this.gl) {
            throw new Error('WebGL not supported');
        }

        // Compile shaders
        await this.compileShaders();

        // Create texture for video frames
        this.createTexture();

        // Set up geometry (full-screen quad)
        this.setupGeometry();

        return this;
    }

    /**
     * Position canvas to match video element
     */
    positionCanvas() {
        // Make video parent relative for absolute positioning
        const parent = this.video.parentElement;
        if (parent && getComputedStyle(parent).position === 'static') {
            parent.style.position = 'relative';
        }

        // Insert canvas after video
        this.video.after(this.canvas);

        // Match video dimensions
        this.canvas.width = this.video.videoWidth || 1920;
        this.canvas.height = this.video.videoHeight || 1080;
    }

    /**
     * Compile vertex and fragment shaders
     */
    async compileShaders() {
        const gl = this.gl;

        // Vertex shader - simple pass-through
        const vertexSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;

        // Fragment shader - combined enhancement pipeline
        const fragmentSource = `
      precision mediump float;
      
      varying vec2 v_texCoord;
      uniform sampler2D u_texture;
      uniform vec2 u_resolution;
      uniform float u_debanding;
      uniform float u_smoothing;
      uniform float u_sharpening;
      uniform float u_time;
      
      // Pseudo-random for blue-noise approximation
      float rand(vec2 co) {
        return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      // Blue-noise-like dithering pattern
      float blueNoise(vec2 uv) {
        float n = rand(uv + u_time * 0.01);
        n = (n - 0.5) * 2.0; // Range -1 to 1
        return n;
      }
      
      // Get luminance
      float getLuma(vec3 color) {
        return dot(color, vec3(0.299, 0.587, 0.114));
      }
      
      // Bilateral-ish smoothing for block artifacts
      vec3 smoothPixel(vec2 uv, vec3 centerColor) {
        vec2 texelSize = 1.0 / u_resolution;
        float centerLuma = getLuma(centerColor);
        
        vec3 sum = centerColor;
        float weightSum = 1.0;
        
        // Sample 8 neighbors
        for (float x = -1.0; x <= 1.0; x += 1.0) {
          for (float y = -1.0; y <= 1.0; y += 1.0) {
            if (x == 0.0 && y == 0.0) continue;
            
            vec2 offset = vec2(x, y) * texelSize;
            vec3 sampleColor = texture2D(u_texture, uv + offset).rgb;
            float sampleLuma = getLuma(sampleColor);
            
            // Edge-aware weight
            float lumaDiff = abs(centerLuma - sampleLuma);
            float weight = exp(-lumaDiff * 10.0) * 0.5;
            
            sum += sampleColor * weight;
            weightSum += weight;
          }
        }
        
        return sum / weightSum;
      }
      
      // Contrast-adaptive sharpening
      vec3 sharpen(vec2 uv, vec3 color) {
        vec2 texelSize = 1.0 / u_resolution;
        
        // Sample neighbors
        vec3 up = texture2D(u_texture, uv + vec2(0.0, -texelSize.y)).rgb;
        vec3 down = texture2D(u_texture, uv + vec2(0.0, texelSize.y)).rgb;
        vec3 left = texture2D(u_texture, uv + vec2(-texelSize.x, 0.0)).rgb;
        vec3 right = texture2D(u_texture, uv + vec2(texelSize.x, 0.0)).rgb;
        
        // Unsharp mask
        vec3 neighbors = (up + down + left + right) * 0.25;
        vec3 sharpened = color + (color - neighbors) * u_sharpening;
        
        // Reduce sharpening on already-sharp edges
        float edgeStrength = length(color - neighbors);
        float adaptive = 1.0 - min(edgeStrength * 2.0, 0.5);
        
        return mix(color, sharpened, adaptive);
      }
      
      void main() {
        vec4 texColor = texture2D(u_texture, v_texCoord);
        vec3 color = texColor.rgb;
        
        // Step 1: Debanding with blue-noise dithering
        if (u_debanding > 0.0) {
          float noise = blueNoise(v_texCoord * u_resolution) * u_debanding * 0.02;
          color += noise;
        }
        
        // Step 2: Gentle smoothing for block artifacts
        if (u_smoothing > 0.0) {
          vec3 smoothed = smoothPixel(v_texCoord, color);
          color = mix(color, smoothed, u_smoothing * 0.5);
        }
        
        // Step 3: Contrast-adaptive sharpening
        if (u_sharpening > 0.0) {
          color = sharpen(v_texCoord, color);
        }
        
        // Clamp to valid range
        color = clamp(color, 0.0, 1.0);
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;

        // Compile vertex shader
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexSource);
        gl.compileShader(vertexShader);

        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            throw new Error('Vertex shader compile error: ' + gl.getShaderInfoLog(vertexShader));
        }

        // Compile fragment shader
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentSource);
        gl.compileShader(fragmentShader);

        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            throw new Error('Fragment shader compile error: ' + gl.getShaderInfoLog(fragmentShader));
        }

        // Link program
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            throw new Error('Program link error: ' + gl.getProgramInfoLog(this.program));
        }

        gl.useProgram(this.program);
    }

    /**
     * Create texture for video frames
     */
    createTexture() {
        const gl = this.gl;

        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        // Set texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    /**
     * Set up full-screen quad geometry
     */
    setupGeometry() {
        const gl = this.gl;

        // Position buffer (clip space)
        const positions = new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            1, 1
        ]);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        const positionLoc = gl.getAttribLocation(this.program, 'a_position');
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

        // Texture coordinate buffer
        const texCoords = new Float32Array([
            0, 1,
            1, 1,
            0, 0,
            1, 0
        ]);

        const texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

        const texCoordLoc = gl.getAttribLocation(this.program, 'a_texCoord');
        gl.enableVertexAttribArray(texCoordLoc);
        gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    }

    /**
     * Update preset parameters
     */
    setPreset(preset) {
        this.preset = preset;
    }

    /**
     * Start processing loop
     */
    start() {
        if (this.isProcessing) return;

        this.isProcessing = true;
        this.processFrame();
        console.log('[Video Enhance] Processing started');
    }

    /**
     * Stop processing loop
     */
    stop() {
        this.isProcessing = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        console.log('[Video Enhance] Processing stopped');
    }

    /**
     * Process a single frame
     */
    processFrame() {
        if (!this.isProcessing) return;

        const gl = this.gl;
        const video = this.video;

        // Update canvas size if video size changed
        if (this.canvas.width !== video.videoWidth || this.canvas.height !== video.videoHeight) {
            this.canvas.width = video.videoWidth || 1920;
            this.canvas.height = video.videoHeight || 1080;
            gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }

        // Upload video frame to texture
        if (video.readyState >= video.HAVE_CURRENT_DATA) {
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

            // Set uniforms
            gl.uniform2f(gl.getUniformLocation(this.program, 'u_resolution'), this.canvas.width, this.canvas.height);
            gl.uniform1f(gl.getUniformLocation(this.program, 'u_debanding'), this.preset.debanding || 0);
            gl.uniform1f(gl.getUniformLocation(this.program, 'u_smoothing'), this.preset.smoothing || 0);
            gl.uniform1f(gl.getUniformLocation(this.program, 'u_sharpening'), this.preset.sharpening || 0);
            gl.uniform1f(gl.getUniformLocation(this.program, 'u_time'), performance.now() * 0.001);

            // Draw
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }

        // Schedule next frame
        this.animationId = requestAnimationFrame(() => this.processFrame());
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.stop();

        if (this.canvas && this.canvas.parentElement) {
            this.canvas.remove();
        }

        if (this.gl) {
            this.gl.deleteTexture(this.texture);
            this.gl.deleteProgram(this.program);
        }

        this.canvas = null;
        this.gl = null;
        this.program = null;
        this.texture = null;

        console.log('[Video Enhance] Processor destroyed');
    }
}

// Make available globally
window.VideoProcessor = VideoProcessor;
