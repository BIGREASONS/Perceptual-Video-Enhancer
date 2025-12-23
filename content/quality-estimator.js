// Quality Estimator - Heuristic quality analysis for video elements
// Returns quality score (0-100) and recommended preset

const VideoQualityEstimator = {
    /**
     * Estimate the quality of a video element
     * @param {HTMLVideoElement} video - The video element to analyze
     * @returns {Object} Quality information
     */
    estimate(video) {
        const metrics = this.gatherMetrics(video);
        const score = this.calculateScore(metrics);
        const preset = this.recommendPreset(score, metrics);

        return {
            score,
            preset,
            metrics,
            description: this.getDescription(score)
        };
    },

    /**
     * Gather all relevant metrics from the video element
     */
    gatherMetrics(video) {
        const metrics = {
            // Video intrinsic resolution
            videoWidth: video.videoWidth || 0,
            videoHeight: video.videoHeight || 0,

            // Display size
            displayWidth: video.clientWidth || video.offsetWidth || 0,
            displayHeight: video.clientHeight || video.offsetHeight || 0,

            // Playback quality (if available)
            droppedFrames: 0,
            totalFrames: 0,
            droppedFrameRatio: 0,

            // Derived metrics
            effectiveDPI: 0,
            isUpscaled: false,
            upscaleFactor: 1
        };

        // Get playback quality if available
        if (typeof video.getVideoPlaybackQuality === 'function') {
            const quality = video.getVideoPlaybackQuality();
            metrics.droppedFrames = quality.droppedVideoFrames || 0;
            metrics.totalFrames = quality.totalVideoFrames || 0;
            metrics.droppedFrameRatio = metrics.totalFrames > 0
                ? metrics.droppedFrames / metrics.totalFrames
                : 0;
        }

        // Calculate effective DPI (how many source pixels per display pixel)
        if (metrics.displayWidth > 0 && metrics.videoWidth > 0) {
            metrics.effectiveDPI = metrics.videoWidth / metrics.displayWidth;
            metrics.isUpscaled = metrics.effectiveDPI < 0.9; // Less than 90% means upscaling
            metrics.upscaleFactor = 1 / metrics.effectiveDPI;
        }

        return metrics;
    },

    /**
     * Calculate overall quality score (0-100)
     */
    calculateScore(metrics) {
        let score = 100;

        // Penalize low resolution relative to display
        if (metrics.isUpscaled) {
            // Heavily penalize large upscaling
            const upscalePenalty = Math.min(50, (metrics.upscaleFactor - 1) * 30);
            score -= upscalePenalty;
        }

        // Penalize very low absolute resolution
        if (metrics.videoWidth > 0) {
            if (metrics.videoWidth < 480) score -= 25;
            else if (metrics.videoWidth < 720) score -= 15;
            else if (metrics.videoWidth < 1080) score -= 5;
        }

        // Penalize high dropped frame ratio (indicates struggling decoder/bandwidth)
        if (metrics.droppedFrameRatio > 0.05) {
            score -= Math.min(20, metrics.droppedFrameRatio * 100);
        }

        return Math.max(0, Math.min(100, Math.round(score)));
    },

    /**
     * Recommend a preset based on score and metrics
     */
    recommendPreset(score, metrics) {
        // Very high quality - minimal enhancement
        if (score >= 80) {
            return 'clean';
        }

        // Low quality - full low-bitrate repair
        if (score < 50) {
            return 'low-bitrate';
        }

        // Medium quality - light enhancement
        return 'low-bitrate';
    },

    /**
     * Get human-readable description of quality
     */
    getDescription(score) {
        if (score >= 80) return 'Good quality';
        if (score >= 60) return 'Acceptable quality';
        if (score >= 40) return 'Low quality - enhancement recommended';
        return 'Poor quality - enhancement strongly recommended';
    },

    /**
     * Check if video is likely DRM protected
     * Note: This is a heuristic and not 100% reliable
     */
    isLikelyDRM(video) {
        // Check for MediaKeys (EME)
        if (video.mediaKeys) {
            return true;
        }

        // Check for known DRM-using domains
        const drmDomains = ['netflix.com', 'primevideo.com', 'disneyplus.com', 'hbomax.com', 'hulu.com'];
        const hostname = window.location.hostname;

        for (const domain of drmDomains) {
            if (hostname.includes(domain)) {
                return true;
            }
        }

        return false;
    }
};

// Make available globally for other content scripts
window.VideoQualityEstimator = VideoQualityEstimator;
