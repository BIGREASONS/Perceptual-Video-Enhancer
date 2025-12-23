// Video Detector - Finds and monitors video elements on the page
// Uses MutationObserver for dynamically added videos

(function () {
    'use strict';

    // Track processed videos
    const processedVideos = new WeakMap();
    let extensionState = null;

    /**
     * Initialize the video detector
     */
    async function init() {
        // Get initial state from background
        try {
            extensionState = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
        } catch (e) {
            console.log('[Video Enhance] Could not get initial state:', e.message);
            extensionState = { enabled: false, preset: 'low-bitrate' };
        }

        // Find existing videos
        findVideos();

        // Watch for new videos
        observeDOM();

        // Listen for state changes
        chrome.runtime.onMessage.addListener(handleMessage);

        console.log('[Video Enhance] Video detector initialized');
    }

    /**
     * Handle messages from background script
     */
    function handleMessage(message, sender, sendResponse) {
        switch (message.type) {
            case 'STATE_CHANGED':
                extensionState = message.state;
                updateAllVideos();
                sendResponse({ acknowledged: true });
                break;

            case 'GET_VIDEO_INFO':
                const videos = document.querySelectorAll('video');
                const visibleVideos = Array.from(videos).filter(v => isVideoValid(v));

                let quality = null;
                if (visibleVideos.length > 0 && window.VideoQualityEstimator) {
                    quality = window.VideoQualityEstimator.estimate(visibleVideos[0]);
                }

                sendResponse({
                    videoCount: visibleVideos.length,
                    quality: quality
                });
                break;

            default:
                sendResponse({ error: 'Unknown message type' });
        }
        return true;
    }

    /**
     * Find all video elements on the page
     */
    function findVideos() {
        const videos = document.querySelectorAll('video');
        videos.forEach(processVideo);
    }

    /**
     * Set up MutationObserver to detect dynamically added videos
     */
    function observeDOM() {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                // Check added nodes
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if node is a video
                        if (node.tagName === 'VIDEO') {
                            processVideo(node);
                        }
                        // Check for videos inside node
                        const videos = node.querySelectorAll?.('video');
                        if (videos) {
                            videos.forEach(processVideo);
                        }
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Process a video element
     */
    function processVideo(video) {
        // Skip if already processed
        if (processedVideos.has(video)) return;

        // Validate video
        if (!isVideoValid(video)) {
            // Re-check when video becomes ready
            video.addEventListener('loadedmetadata', () => processVideo(video), { once: true });
            return;
        }

        // Check for DRM
        if (window.VideoQualityEstimator?.isLikelyDRM(video)) {
            console.log('[Video Enhance] Skipping DRM-protected video');
            processedVideos.set(video, { drm: true });
            return;
        }

        // Create video info
        const info = {
            processor: null,
            quality: null,
            drm: false
        };

        // Estimate quality
        if (window.VideoQualityEstimator) {
            info.quality = window.VideoQualityEstimator.estimate(video);
        }

        processedVideos.set(video, info);

        // Report to background
        chrome.runtime.sendMessage({
            type: 'VIDEO_DETECTED',
            info: {
                width: video.videoWidth,
                height: video.videoHeight,
                quality: info.quality
            }
        }).catch(() => { }); // Ignore errors

        // Start processing if enabled
        if (extensionState?.enabled) {
            enableProcessing(video);
        }

        // Watch for video end/removal
        video.addEventListener('ended', () => disableProcessing(video));
        video.addEventListener('emptied', () => disableProcessing(video));

        // Watch for video removal from DOM
        const removalObserver = new MutationObserver((mutations) => {
            if (!document.body.contains(video)) {
                disableProcessing(video);
                processedVideos.delete(video);
                removalObserver.disconnect();
            }
        });
        removalObserver.observe(document.body, { childList: true, subtree: true });

        console.debug('[Video Enhance] Video processed:', video.videoWidth, 'x', video.videoHeight);
    }

    /**
     * Check if video is valid for processing
     */
    function isVideoValid(video) {
        return (
            video.videoWidth > 0 &&
            video.videoHeight > 0 &&
            video.readyState >= video.HAVE_METADATA &&
            isVisible(video)
        );
    }

    /**
     * Check if element is visible
     */
    function isVisible(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.width > 0 &&
            rect.height > 0 &&
            rect.top < window.innerHeight &&
            rect.bottom > 0 &&
            rect.left < window.innerWidth &&
            rect.right > 0
        );
    }

    /**
     * Enable processing for a video
     */
    async function enableProcessing(video) {
        const info = processedVideos.get(video);
        if (!info || info.drm || info.processor) return;

        try {
            const preset = getPresetSettings();
            const processor = new window.VideoProcessor(video, { preset });
            await processor.init();
            processor.start();
            info.processor = processor;
            console.log('[Video Enhance] Processing enabled for video');
        } catch (e) {
            console.error('[Video Enhance] Failed to enable processing:', e);
        }
    }

    /**
     * Disable processing for a video
     */
    function disableProcessing(video) {
        const info = processedVideos.get(video);
        if (!info || !info.processor) return;

        info.processor.destroy();
        info.processor = null;
        console.log('[Video Enhance] Processing disabled for video');
    }

    /**
     * Update all processed videos based on current state
     */
    function updateAllVideos() {
        const videos = document.querySelectorAll('video');

        for (const video of videos) {
            const info = processedVideos.get(video);
            if (!info || info.drm) continue;

            if (extensionState?.enabled) {
                if (!info.processor) {
                    enableProcessing(video);
                } else {
                    // Update preset
                    info.processor.setPreset(getPresetSettings());
                }
            } else {
                if (info.processor) {
                    disableProcessing(video);
                }
            }
        }
    }

    /**
     * Get current preset settings
     */
    function getPresetSettings() {
        const presetKey = extensionState?.preset || 'low-bitrate';
        const presets = extensionState?.presets || {};
        return presets[presetKey] || {
            debanding: 0.5,
            smoothing: 0.3,
            sharpening: 0.15
        };
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
