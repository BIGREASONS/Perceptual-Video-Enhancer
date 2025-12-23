// Sharpening Shader - Contrast-adaptive sharpening (CAS)
// This shader is embedded in video-processor.js but kept here for reference

precision mediump float;

varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_sharpening;

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
  
  // Apply sharpening
  if (u_sharpening > 0.0) {
    color = sharpen(v_texCoord, color);
  }
  
  // Clamp to valid range
  color = clamp(color, 0.0, 1.0);
  
  gl_FragColor = vec4(color, 1.0);
}
