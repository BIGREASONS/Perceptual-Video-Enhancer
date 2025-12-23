# Limitations & Honest Disclosure

## What This Extension CAN Do

✅ **Reduce visible banding** in color gradients using dithering  
✅ **Soften block artifacts** from heavy compression  
✅ **Add subtle sharpening** to help edges appear cleaner  
✅ **Work in real-time** using GPU-accelerated WebGL  
✅ **Improve perceived quality** of low-bitrate streams  

## What This Extension CANNOT Do

❌ **Add missing detail** - Cannot invent information that wasn't captured  
❌ **Truly upscale** - This is not AI super-resolution or machine learning  
❌ **Fix severe compression** - Very low quality video has limits  
❌ **Improve audio** - This only affects video  
❌ **Work on all video players** - Some custom implementations may not work  

## DRM Compatibility

This extension does not interact with DRM-protected content.
If a video element cannot be accessed by the browser,
processing is automatically disabled to avoid playback issues.

## Technical Limitations

### Performance
- GPU required for smooth operation
- Very high resolution videos (4K+) may cause frame drops on integrated graphics
- Multiple videos on same page increases load

### Compatibility
- Some websites use custom video implementations that may not be detected
- Picture-in-Picture mode may not be processed

### Visual Quality
- Enhancement is subtle by design (aggressive processing looks worse)
- Cannot fix motion blur or camera shake
- Cannot improve dark/underexposed footage
- Sharpening on already-sharp content may cause ringing artifacts

## Why Be Honest?

Many browser extensions promise "AI upscaling" or "4K enhancement" - these claims are misleading. True AI upscaling requires significant compute power and cannot run in real-time in a browser.

This extension does what's actually achievable: subtle, tasteful perceptual improvements using proven post-processing techniques. It won't make 240p look like 4K, but it can make 480p look noticeably cleaner.

## Tested On

- ✅ YouTube
- ✅ Vimeo  
- ✅ HTML5 video elements
- ⚠️ Twitch (partial - may have issues with some player states)
