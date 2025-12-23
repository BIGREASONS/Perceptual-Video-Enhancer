// Debanding Shader - Blue-noise dithering to reduce color banding
// This shader is embedded in video-processor.js but kept here for reference

precision mediump float;

varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_debanding;
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

void main() {
  vec4 texColor = texture2D(u_texture, v_texCoord);
  vec3 color = texColor.rgb;
  
  // Apply blue-noise dithering
  if (u_debanding > 0.0) {
    float noise = blueNoise(v_texCoord * u_resolution) * u_debanding * 0.02;
    color += noise;
  }
  
  // Clamp to valid range
  color = clamp(color, 0.0, 1.0);
  
  gl_FragColor = vec4(color, 1.0);
}
