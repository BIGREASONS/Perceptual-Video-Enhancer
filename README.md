# Perceptual Video Enhancer

A browser extension for Edge that applies perceptual
post-processing to HTML5 video playback to reduce visible artifacts
caused by aggressive compression.

## Features
- Adaptive debanding using dithering techniques
- Edge-aware smoothing for block artifacts
- Optional contrast-adaptive sharpening
- Presets for Clean, Low-Bitrate Repair, and Anime
- Lightweight WebGL processing with minimal overhead

## How It Works
The extension detects HTML5 video elements and applies reversible,
real-time visual filters using browser-safe rendering techniques.
All processing is local and does not re-encode video streams.

## DRM Compatibility
The extension does not interact with DRM-protected content.
Processing is automatically disabled where video access is restricted.

## Limitations
- Does not restore lost detail
- Does not enable HDR
- Does not re-encode video
- Effectiveness depends on source quality

## Installation
### Microsoft Edge
1. Open edge://extensions
2. Enable Developer Mode
3. Click "Load unpacked"
4. Select the extension folder

## Privacy
This extension does not collect, store, or transmit personal data.
All processing occurs locally in the browser.

## License
MIT
