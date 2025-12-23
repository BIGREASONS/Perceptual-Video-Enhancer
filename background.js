// background.js
// Maintains extension state and synchronizes preset selection
// across content scripts without persistent page access.
// This avoids requiring tabs permission or page-level storage.

// In-memory state (resets when browser closes - this is intentional for minimal permissions)
let extensionState = {
  enabled: false,
  preset: 'low-bitrate',
  presets: {
    'clean': {
      name: 'Clean',
      debanding: 0.1,
      smoothing: 0.0,
      sharpening: 0.0,
      description: 'Minimal enhancement for already-good video'
    },
    'low-bitrate': {
      name: 'Low-Bitrate Repair',
      debanding: 0.5,
      smoothing: 0.3,
      sharpening: 0.15,
      description: 'For YouTube 480p, streaming on slow connections'
    },
    'anime': {
      name: 'Anime / Flat-Color',
      debanding: 0.7,
      smoothing: 0.4,
      sharpening: 0.05,
      description: 'For anime with heavy banding in gradients'
    }
  }
};

// Get current state
function getState() {
  return extensionState;
}

// Update state
function setState(updates) {
  extensionState = { ...extensionState, ...updates };
  return extensionState;
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // Indicates async response
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case 'GET_STATE':
      return getState();

    case 'SET_ENABLED':
      const stateAfterEnabled = setState({ enabled: message.enabled });
      // Notify all tabs about the change
      await notifyAllTabs({ type: 'STATE_CHANGED', state: stateAfterEnabled });
      return stateAfterEnabled;

    case 'SET_PRESET':
      const stateAfterPreset = setState({ preset: message.preset });
      await notifyAllTabs({ type: 'STATE_CHANGED', state: stateAfterPreset });
      return stateAfterPreset;

    case 'GET_VIDEO_INFO':
      // Forward request to content script in active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_VIDEO_INFO' });
          return response;
        } catch (e) {
          return { videoCount: 0, quality: null };
        }
      }
      return { videoCount: 0, quality: null };

    case 'VIDEO_DETECTED':
      // Content script reports video detection
      console.log('[Video Enhance] Video detected:', message.info);
      return { acknowledged: true };

    default:
      console.warn('[Video Enhance] Unknown message type:', message.type);
      return { error: 'Unknown message type' };
  }
}

// Notify all tabs about state changes
async function notifyAllTabs(message) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, message);
      } catch (e) {
        // Tab might not have content script loaded, ignore
      }
    }
  }
}

console.log('[Video Enhance] Background service worker started');
