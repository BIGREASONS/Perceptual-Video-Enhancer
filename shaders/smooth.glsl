// Smoothing Shader - Gentle luma smoothing for block artifacts
// This shader is embedded in video-processor.js but kept here for reference

precision mediump float;

varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_smoothing;

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

void main() {
  vec4 texColor = texture2D(u_texture, v_texCoord);
  vec3 color = texColor.rgb;
  
  // Apply smoothing
  if (u_smoothing > 0.0) {
    vec3 smoothed = smoothPixel(v_texCoord, color);
    color = mix(color, smoothed, u_smoothing * 0.5);
  }
  
  gl_FragColor = vec4(color, 1.0);
}
