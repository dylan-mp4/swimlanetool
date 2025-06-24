// --- Element Selectors ---
const numberInput = document.getElementById('number-input');
const saveButton = document.getElementById('set-number');
const intervalInput = document.getElementById('interval-input');
const intervalButton = document.getElementById('set-interval');
const doomModeCheckbox = document.getElementById('doom-mode-checkbox');
const autoRefreshCheckbox = document.getElementById('auto-refresh-checkbox');
const slaCheckerCheckbox = document.getElementById('sla-checker-checkbox');
const disableFlashingCheckbox = document.getElementById('disable-flashing-checkbox');
const disableSeverityCheckbox = document.getElementById('disable-severity-checkbox');
const debugModeCheckbox = document.getElementById('debug-mode-checkbox');
const debugLogLevelSelect = document.getElementById('debug-log-level');
const visualChangesCheckbox = document.getElementById('visual-changes-checkbox');
const commentTextWrapCheckbox = document.getElementById('comment-textwrap-checkbox');
const searchOverlayCheckbox = document.getElementById('search-overlay-checkbox');
const discrepancyCheckingCheckbox = document.getElementById('discrepancy-checking-checkbox');
const autoShowCaseDetailsCheckbox = document.getElementById('auto-show-case-details-checkbox');
const developerSettingsCheckbox = document.getElementById('developer-settings-checkbox');

// --- Utility ---
var debugLogLevel = 0;

function log(message, level = 3, ...args) {
    if (debugLogLevel >= level) {
        console.log(`SLTool: ${message}`, ...args);
    }
}

// --- Loaders ---
function loadPopupValues() {
    chrome.storage.sync.get([
        'matchingNumber',
        'refreshInterval',
        'doomMode',
        'autoRefresh',
        'slaCheckerEnabled',
        'disableFlashing',
        'disableSeverity',
        'debugMode',
        'debugLogLevel',
        'visualChangesEnabled',
        'commentTextWrapEnabled',
        'searchOverlayEnabled',
        'discrepancyCheckingEnabled',
        'autoShowCaseDetails',
        'developerSettingsEnabled'
    ], (data) => {
        if (data.matchingNumber !== undefined) numberInput.value = data.matchingNumber;
        if (data.refreshInterval !== undefined) intervalInput.value = data.refreshInterval;
        if (data.doomMode !== undefined) doomModeCheckbox.checked = data.doomMode;
        if (data.autoRefresh !== undefined) autoRefreshCheckbox.checked = data.autoRefresh;
        if (data.slaCheckerEnabled !== undefined) slaCheckerCheckbox.checked = data.slaCheckerEnabled;
        if (data.disableFlashing !== undefined) disableFlashingCheckbox.checked = data.disableFlashing;
        if (data.disableSeverity !== undefined) disableSeverityCheckbox.checked = data.disableSeverity;
        if (data.debugMode !== undefined) debugModeCheckbox.checked = data.debugMode;
        if (debugLogLevelSelect) debugLogLevelSelect.value = data.debugLogLevel !== undefined ? data.debugLogLevel : "0";
        if (visualChangesCheckbox) visualChangesCheckbox.checked = data.visualChangesEnabled !== false;
        if (commentTextWrapCheckbox) commentTextWrapCheckbox.checked = data.commentTextWrapEnabled !== false;
        if (searchOverlayCheckbox) searchOverlayCheckbox.checked = data.searchOverlayEnabled !== false;
        if (discrepancyCheckingCheckbox) discrepancyCheckingCheckbox.checked = data.discrepancyCheckingEnabled !== false;
        if (autoShowCaseDetailsCheckbox) autoShowCaseDetailsCheckbox.checked = data.autoShowCaseDetails !== false;
        if (developerSettingsCheckbox) developerSettingsCheckbox.checked = data.developerSettingsEnabled === true;
    });
}

function renderHighlightColumns(headers, selectedColumns) {
    const container = document.getElementById('highlight-columns-container');
    container.innerHTML = '';
    headers.forEach(header => {
        const id = `highlight-col-${header.replace(/\s+/g, '-')}`;
        const label = document.createElement('label');
        label.style.display = 'block';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = id;
        checkbox.value = header;
        checkbox.checked = selectedColumns.includes(header);
        checkbox.addEventListener('change', () => {
            // Save selected columns to storage
            const checked = Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
            chrome.storage.sync.set({ highlightColumns: checked });
            // Notify content script to update highlights
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'updateHighlightColumns', highlightColumns: checked });
            });
        });
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(' ' + header));
        container.appendChild(label);
    });
}

function loadHighlightColumns() {
    // Get headers from content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getHeaders' }, (response) => {
            const headers = response && response.headers ? response.headers : [];
            chrome.storage.sync.get(['highlightColumns'], (data) => {
                const selected = Array.isArray(data.highlightColumns) ? data.highlightColumns : [];
                renderHighlightColumns(headers, selected);
            });
        });
    });
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', loadPopupValues);
document.addEventListener('DOMContentLoaded', loadHighlightColumns);

document.addEventListener('DOMContentLoaded', () => {
    const selectAllBtn = document.getElementById('select-all-columns');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            const container = document.getElementById('highlight-columns-container');
            const checkboxes = container.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = true);
            const checked = Array.from(checkboxes).map(cb => cb.value);
            chrome.storage.sync.set({ highlightColumns: checked });
        });
    }
});

// --- Checkbox and Input Handlers ---
slaCheckerCheckbox.addEventListener('change', () => {
    const slaCheckerEnabled = slaCheckerCheckbox.checked;
    chrome.storage.sync.set({ slaCheckerEnabled }, () => {
        log('SLA Checker state saved:', 2, slaCheckerEnabled);
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'updateSlaChecker', enabled: slaCheckerEnabled });
    });
});

saveButton.addEventListener('click', () => {
    const numberToMatch = numberInput.value;
    chrome.storage.sync.set({ matchingNumber: numberToMatch }, () => {
        log('Matching number saved:', 2, numberToMatch);
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'updateNumber', number: numberToMatch });
    });

    const statusMessage = document.getElementById('status-message');
    statusMessage.textContent = 'Matching number saved.';
    setTimeout(() => {
        statusMessage.textContent = '';
    }, 2000);
});

intervalButton.addEventListener('click', () => {
    const interval = parseInt(intervalInput.value, 10);
    const intervalStatusMessage = document.getElementById('interval-status-message');
    if (interval >= 20) {
        chrome.storage.sync.set({ refreshInterval: interval }, () => {
            log('Refresh interval saved:', 2, interval);
        });

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'updateInterval', interval: interval });
        });

        intervalStatusMessage.textContent = 'Refresh interval saved.';
        setTimeout(() => {
            intervalStatusMessage.textContent = '';
        }, 2000);
    } else {
        intervalStatusMessage.textContent = 'Interval must be at least 20 seconds.';
        setTimeout(() => {
            intervalStatusMessage.textContent = '';
        }, 2000);
    }
});

doomModeCheckbox.addEventListener('change', () => {
    const doomModeEnabled = doomModeCheckbox.checked;
    chrome.storage.sync.set({ doomMode: doomModeEnabled }, () => {
        log('Doom Mode state saved:', 2, doomModeEnabled);
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'updateDoomMode', enabled: doomModeEnabled });
    });
});

autoRefreshCheckbox.addEventListener('change', () => {
    const autoRefreshEnabled = autoRefreshCheckbox.checked;
    chrome.storage.sync.set({ autoRefresh: autoRefreshEnabled }, () => {
        log('Auto-Refresh state saved:', 2, autoRefreshEnabled);
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'updateAutoRefresh', enabled: autoRefreshEnabled });
    });
});

disableFlashingCheckbox.addEventListener('change', () => {
    const disableFlashing = disableFlashingCheckbox.checked;
    chrome.storage.sync.set({ disableFlashing }, () => {
        log('Flashing setting saved:', 2, disableFlashing);
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'updateFlashingSetting', disableFlashing });
    });
});

disableSeverityCheckbox.addEventListener('change', () => {
    const disableSeverity = disableSeverityCheckbox.checked;
    chrome.storage.sync.set({ disableSeverity }, () => {
        log('Severity highlighting setting saved:', 2, disableSeverity);
    });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'updateDisableSeverity', disableSeverity });
    });
});

debugModeCheckbox.addEventListener('change', () => {
    const debugMode = debugModeCheckbox.checked;
    chrome.storage.sync.set({ debugMode }, () => {
        log('SLTool: Debug mode setting saved:', 2, debugMode);
    });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'updateDebugMode', debugMode });
    });
});

if (debugLogLevelSelect) {
    debugLogLevelSelect.addEventListener('change', () => {
        const debugLogLevel = debugLogLevelSelect.value;
        chrome.storage.sync.set({ debugLogLevel }, () => {
            log('Debug log level saved:', 2, debugLogLevel);
        });
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'updateDebugLogLevel', debugLogLevel });
        });
    });
}

if (visualChangesCheckbox) {
    visualChangesCheckbox.addEventListener('change', () => {
        chrome.storage.sync.set({ visualChangesEnabled: visualChangesCheckbox.checked });
    });
}
if (commentTextWrapCheckbox) {
    commentTextWrapCheckbox.addEventListener('change', () => {
        chrome.storage.sync.set({ commentTextWrapEnabled: commentTextWrapCheckbox.checked });
    });
}
if (searchOverlayCheckbox) {
    searchOverlayCheckbox.addEventListener('change', () => {
        chrome.storage.sync.set({ searchOverlayEnabled: searchOverlayCheckbox.checked });
    });
}
if (discrepancyCheckingCheckbox) {
    discrepancyCheckingCheckbox.addEventListener('change', () => {
        const discrepancyCheckingEnabled = discrepancyCheckingCheckbox.checked;
        chrome.storage.sync.set({ discrepancyCheckingEnabled }, () => {
            log('Discrepancy Checking setting saved:', 2, discrepancyCheckingEnabled);
        });
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'updateDiscrepancyChecking', enabled: discrepancyCheckingEnabled });
        });
    });
}
if (autoShowCaseDetailsCheckbox) {
    autoShowCaseDetailsCheckbox.addEventListener('change', () => {
        const autoShowCaseDetails = autoShowCaseDetailsCheckbox.checked;
        chrome.storage.sync.set({ autoShowCaseDetails }, () => {
            log('Auto Show Case Details setting saved:', 2, autoShowCaseDetails);
        });
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'updateAutoShowCaseDetails', enabled: autoShowCaseDetails });
        });
    });
}
if (developerSettingsCheckbox) {
    developerSettingsCheckbox.addEventListener('change', () => {
        const developerSettingsEnabled = developerSettingsCheckbox.checked;
        chrome.storage.sync.set({ developerSettingsEnabled }, () => {
            log('Developer Settings state saved:', 2, developerSettingsEnabled);
        });
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'updateDeveloperSettings', developerSettingsEnabled });
        });
    });
}