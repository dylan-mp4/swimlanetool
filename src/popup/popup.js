const numberInput = document.getElementById('number-input');
const saveButton = document.getElementById('set-number');
const intervalInput = document.getElementById('interval-input');
const intervalButton = document.getElementById('set-interval');
const doomModeCheckbox = document.getElementById('doom-mode-checkbox');
const autoRefreshCheckbox = document.getElementById('auto-refresh-checkbox');
const slaCheckerCheckbox = document.getElementById('sla-checker-checkbox');
const disableFlashingCheckbox = document.getElementById('disable-flashing-checkbox');

// Function to load and propagate values into the popup fields
function loadPopupValues() {
    chrome.storage.sync.get(['matchingNumber', 'refreshInterval', 'doomMode', 'autoRefresh', 'slaCheckerEnabled', 'disableFlashing'], (data) => {
        if (data.matchingNumber !== undefined) {
            numberInput.value = data.matchingNumber;
        }
        if (data.refreshInterval !== undefined) {
            intervalInput.value = data.refreshInterval;
        }
        if (data.doomMode !== undefined) {
            doomModeCheckbox.checked = data.doomMode;
        }
        if (data.autoRefresh !== undefined) {
            autoRefreshCheckbox.checked = data.autoRefresh;
        }
        if (data.slaCheckerEnabled !== undefined) {
            slaCheckerCheckbox.checked = data.slaCheckerEnabled;
        }
        if (data.disableFlashing !== undefined) {
            disableFlashingCheckbox.checked = data.disableFlashing;
        }
    });
}

// Load values when the popup is opened
document.addEventListener('DOMContentLoaded', loadPopupValues);

// Save the SLA Checker state to storage and notify the content script
slaCheckerCheckbox.addEventListener('change', () => {
    const slaCheckerEnabled = slaCheckerCheckbox.checked;
    chrome.storage.sync.set({ slaCheckerEnabled }, () => {
        console.log('SLTool: SLA Checker state saved:', slaCheckerEnabled);
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'updateSlaChecker', enabled: slaCheckerEnabled });
    });
});

// Save the matching number to storage
saveButton.addEventListener('click', () => {
    const numberToMatch = numberInput.value;
    chrome.storage.sync.set({ matchingNumber: numberToMatch }, () => {
        console.log('Matching number saved:', numberToMatch);
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

// Save the refresh interval to storage
intervalButton.addEventListener('click', () => {
    const interval = parseInt(intervalInput.value, 10);
    if (interval >= 20) {
        chrome.storage.sync.set({ refreshInterval: interval }, () => {
            console.log('SLTool: Refresh interval saved:', interval);
        });

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'updateInterval', interval: interval });
        });

        const intervalStatusMessage = document.getElementById('interval-status-message');
        intervalStatusMessage.textContent = 'Refresh interval saved.';
        setTimeout(() => {
            intervalStatusMessage.textContent = '';
        }, 2000);
    } else {
        const intervalStatusMessage = document.getElementById('interval-status-message');
        intervalStatusMessage.textContent = 'Interval must be at least 20 seconds.';
        setTimeout(() => {
            intervalStatusMessage.textContent = '';
        }, 2000);
    }
});

// Save the Doom Mode state to storage
doomModeCheckbox.addEventListener('change', () => {
    const doomModeEnabled = doomModeCheckbox.checked;
    chrome.storage.sync.set({ doomMode: doomModeEnabled }, () => {
        console.log('SLTool: Doom Mode state saved:', doomModeEnabled);
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'updateDoomMode', enabled: doomModeEnabled });
    });
});

// Save the Auto-Refresh state to storage
autoRefreshCheckbox.addEventListener('change', () => {
    const autoRefreshEnabled = autoRefreshCheckbox.checked;
    chrome.storage.sync.set({ autoRefresh: autoRefreshEnabled }, () => {
        console.log('SLTool: Auto-Refresh state saved:', autoRefreshEnabled);
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'updateAutoRefresh', enabled: autoRefreshEnabled });
    });
});

// Save the flashing setting to storage
disableFlashingCheckbox.addEventListener('change', () => {
    const disableFlashing = disableFlashingCheckbox.checked;
    chrome.storage.sync.set({ disableFlashing }, () => {
        console.log('SLTool: Flashing setting saved:', disableFlashing);
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'updateFlashingSetting', disableFlashing });
    });
});