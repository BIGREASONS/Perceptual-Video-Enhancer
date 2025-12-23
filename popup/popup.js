// Popup Script - Handles UI interactions and state

document.addEventListener('DOMContentLoaded', async () => {
    const enableToggle = document.getElementById('enableToggle');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const qualityFill = document.getElementById('qualityFill');
    const qualityValue = document.getElementById('qualityValue');
    const presetGrid = document.getElementById('presetGrid');

    let state = null;

    // Initialize
    await loadState();
    await updateVideoInfo();

    // Toggle handler
    enableToggle.addEventListener('change', async (e) => {
        state = await chrome.runtime.sendMessage({
            type: 'SET_ENABLED',
            enabled: e.target.checked
        });
        updateUI();
    });

    // Preset button handlers
    presetGrid.addEventListener('click', async (e) => {
        const btn = e.target.closest('.preset-btn');
        if (!btn) return;

        const preset = btn.dataset.preset;
        state = await chrome.runtime.sendMessage({
            type: 'SET_PRESET',
            preset: preset
        });
        updateUI();
    });

    /**
     * Load extension state from background
     */
    async function loadState() {
        try {
            state = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
            updateUI();
        } catch (e) {
            console.error('Failed to load state:', e);
            statusText.textContent = 'Extension error';
            statusIndicator.classList.add('warning');
        }
    }

    /**
     * Update UI based on current state
     */
    function updateUI() {
        if (!state) return;

        // Update toggle
        enableToggle.checked = state.enabled;

        // Update status
        if (state.enabled) {
            statusIndicator.classList.add('active');
            statusText.textContent = 'Enhancement active';
        } else {
            statusIndicator.classList.remove('active');
            statusText.textContent = 'Enhancement disabled';
        }

        // Update preset buttons
        const buttons = presetGrid.querySelectorAll('.preset-btn');
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.preset === state.preset);
        });
    }

    /**
     * Get video info from content script
     */
    async function updateVideoInfo() {
        try {
            const info = await chrome.runtime.sendMessage({ type: 'GET_VIDEO_INFO' });

            if (info.videoCount === 0) {
                statusText.textContent = 'No videos detected';
                qualityFill.style.width = '0%';
                qualityValue.textContent = '--';
                return;
            }

            if (info.quality) {
                const score = info.quality.score;
                qualityFill.style.width = `${score}%`;
                qualityValue.textContent = score;

                // Update status text
                if (!state?.enabled) {
                    statusText.textContent = `${info.videoCount} video${info.videoCount > 1 ? 's' : ''} detected`;
                }

                // Color based on quality
                if (score >= 70) {
                    qualityFill.style.background = 'linear-gradient(90deg, #4ade80, #22c55e)';
                } else if (score >= 40) {
                    qualityFill.style.background = 'linear-gradient(90deg, #fbbf24, #f59e0b)';
                } else {
                    qualityFill.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
                }
            }
        } catch (e) {
            console.log('Could not get video info:', e.message);
            statusText.textContent = state?.enabled ? 'Enhancement active' : 'Ready';
        }
    }
});
