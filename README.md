# Video Enhance - Perceptual Quality Boost

A Microsoft Edge extension that applies perceptual post-processing to HTML5 video playback to reduce visible artifacts caused by aggressive compression.

## Features

- **Adaptive debanding** using dithering techniques
- **Edge-aware smoothing** for block artifacts
- **Optional contrast-adaptive sharpening**
- **Presets** for Movies, Low-Bitrate Streams, and Anime
- **Lightweight WebGL processing** with minimal overhead

## DRM Compatibility

This extension does not interact with DRM-protected content.
If a video element cannot be accessed by the browser,
processing is automatically disabled to avoid playback issues.

## Limitations

- Does not re-encode video streams
- Does not restore lost detail
- Does not enable HDR
- Effectiveness depends on source quality

All processing is performed locally in the browser.

## Installation (Developer Mode)

1. Open Microsoft Edge
2. Navigate to `edge://extensions/`
3. Enable **Developer mode** (toggle in bottom-left)
4. Click **Load unpacked**
5. Select the `video-enhance-ext` folder
6. The extension icon should appear in your toolbar

## Usage

1. Navigate to a page with video content (YouTube, etc.)
2. Click the extension icon
3. Toggle the enhancement ON/OFF
4. Choose a preset:
   - **Clean**: Minimal enhancement for good quality video
   - **Repair**: Balanced enhancement for low-bitrate streams
   - **Anime**: Optimized for animated content with gradients

## Presets

| Preset | Debanding | Smoothing | Sharpening | Best For |
|--------|-----------|-----------|------------|----------|
| Clean | 0.1 | 0.0 | 0.0 | Already-good video |
| Repair | 0.5 | 0.3 | 0.15 | YouTube 480p, slow connections |
| Anime | 0.7 | 0.4 | 0.05 | Animated content with banding |

## Technical Details

- Uses WebGL for GPU-accelerated processing
- Real-time processing via `requestAnimationFrame`
- Minimal CPU overhead (<5% typical)
- No external dependencies or network requests

## Permissions

- `activeTab`: Access video on current tab only
- `scripting`: Inject content scripts

## Privacy

This extension does not collect, store, or transmit personal data.
All processing occurs locally in the browser.

## License

MIT License - Free to use and modify.
