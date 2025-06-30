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
const disableTooltipsCheckbox = document.getElementById('disable-tooltips-checkbox');
const hideEmptyAwarenessCheckbox = document.getElementById('hide-empty-awareness-checkbox');
const alertsEnabledCheckbox = document.getElementById('alerts-enabled-checkbox');
const alertStagesContainer = document.getElementById('alert-stages-container');
const audioUrlsContainer = document.getElementById('audio-urls-container');
const saveAudioUrlsButton = document.getElementById('save-audio-urls');
const testAudioAlertButton = document.getElementById('test-audio-alert');
const stopAudioAlertButton = document.getElementById('stop-audio-alert');
document.getElementById('save-sla-colors').addEventListener('click', saveSlaColorProfiles);
// --- Utility ---
var debugLogLevel = 0;
const testAudioIframes = {};

function log(message, level = 3, ...args) {
    if (debugLogLevel >= level) {
        console.log(`SLTool: ${message}`, ...args);
    }
}

function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
    const num = parseInt(hex, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex({ r, g, b }) {
    return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
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
        'developerSettingsEnabled',
        'disableTooltips',
        'hideEmptyAwareness',
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
        if (disableTooltipsCheckbox) disableTooltipsCheckbox.checked = data.disableTooltips === true;
        if (hideEmptyAwarenessCheckbox) hideEmptyAwarenessCheckbox.checked = data.hideEmptyAwareness === true;
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

// --- Audio URL Handlers ---
function loadAlertSettings() {
    chrome.storage.sync.get(['alertsEnabled', 'alertStages', 'alertAudioUrls'], (data) => {
        if (alertsEnabledCheckbox) alertsEnabledCheckbox.checked = data.alertsEnabled || false;

        // Load case stages
        const stages = ["Awaiting Analyst", "Assessment", "Analyst Follow Up", "Response Received"];
        const selectedStages = data.alertStages || [];
        const audioUrls = data.alertAudioUrls || {};
        renderAlertStages(stages, selectedStages);
        renderAudioUrls(stages, audioUrls);
    });
}
function renderAlertStages(stages, selectedStages) {
    alertStagesContainer.innerHTML = '';
    stages.forEach(stage => {
        const id = `alert-stage-${stage.replace(/\s+/g, '-')}`;
        const label = document.createElement('label');
        label.style.display = 'block';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = id;
        checkbox.value = stage;
        checkbox.checked = selectedStages.includes(stage);
        checkbox.addEventListener('change', () => {
            const checkedStages = Array.from(alertStagesContainer.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
            chrome.storage.sync.set({ alertStages: checkedStages });
        });
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(' ' + stage));
        alertStagesContainer.appendChild(label);
    });
}
document.addEventListener('DOMContentLoaded', () => {
    loadAlertSettings();

    // Save Audio URLs
    saveAudioUrlsButton.addEventListener('click', () => {
        const audioUrls = {};
        const audioDropdownSelections = {};
        const containers = audioUrlsContainer.querySelectorAll('.audio-url-container');
        containers.forEach(container => {
            const input = container.querySelector('input[type="text"]');
            const dropdown = container.querySelector('select');
            const stage = input.id.replace('audio-url-', '').replace(/-/g, ' ');
            audioUrls[stage] = input.value.trim();
            audioDropdownSelections[stage] = dropdown.value;
        });
        chrome.storage.sync.set({
            alertAudioUrls: audioUrls,
            alertAudioDropdownSelections: audioDropdownSelections
        }, () => {
            log('Alert audio URLs and dropdown selections saved:', 2, audioUrls, audioDropdownSelections);
        });
        const statusMessage = document.getElementById('audio-urls-status-message');
        statusMessage.textContent = 'Audio URLs saved.';
        setTimeout(() => {
            statusMessage.textContent = '';
        }, 2000);
    });
});
alertsEnabledCheckbox.addEventListener('change', () => {
    const alertsEnabled = alertsEnabledCheckbox.checked;
    chrome.storage.sync.set({ alertsEnabled }, () => {
        log('Alerts enabled state saved:', 2, alertsEnabled);
    });
});
function renderAudioUrls(stages, audioUrls) {
    chrome.storage.sync.get(['alertAudioDropdownSelections'], (data) => {
        const preSavedSounds = [
            { title: "3 Tone ding", url: "https://codeskulptor-demos.commondatastorage.googleapis.com/descent/gotitem.mp3" },
            { title: "Discord Ping", url: "https://www.myinstants.com/media/sounds/y2mate_rQlfs1Y.mp3" },
            { title: "Metal Pipe Clang", url: "https://www.myinstants.com/media/sounds/metal-pipe-clang.mp3" },
            { title: "Jet2Holiday", url: "https://www.myinstants.com/media/sounds/nothing-beats-a-jet2-holiday_IeBO1Mr.mp3" },
            { title: "McDonalds POV", url: "https://www.youtube-nocookie.com/embed/hJY5jgO6HAc?autoplay=1&mute=0" },
            { title: "YIPEEE", url: "https://www.myinstants.com/media/sounds/yippeeeeeeeeeeeeee.mp3" },
            { title: "Spiderman", url: "https://www.youtube-nocookie.com/embed/rFK-IJJRT_o?autoplay=1&mute=0" },
            { title: "Custom", url: "" } // Custom option
        ];

        const dropdownSelections = data.alertAudioDropdownSelections || {};

        audioUrlsContainer.innerHTML = '';
        stages.forEach(stage => {
            const id = `audio-url-${stage.replace(/\s+/g, '-')}`;
            const container = document.createElement('div');
            container.className = 'audio-url-container';

            const label = document.createElement('label');
            label.textContent = stage;
            label.className = 'audio-url-label';

            const dropdown = document.createElement('select');
            dropdown.className = 'audio-url-dropdown';
            dropdown.id = `${id}-dropdown`;

            preSavedSounds.forEach(sound => {
                const option = document.createElement('option');
                option.value = sound.url;
                option.textContent = sound.title;
                dropdown.appendChild(option);
            });

            // Restore dropdown selection if available
            let selectedDropdownValue = dropdownSelections[stage] !== undefined ? dropdownSelections[stage] : (audioUrls[stage] || "");
            dropdown.value = selectedDropdownValue;

            const input = document.createElement('input');
            input.type = 'text';
            input.id = id;
            input.value = audioUrls[stage] || '';
            input.placeholder = `Enter audio URL for ${stage}`;
            input.className = 'audio-url-input';

            // Show input if "Custom" or not matching any pre-saved
            if (!preSavedSounds.some(s => s.url === selectedDropdownValue) || selectedDropdownValue === "") {
                input.style.display = 'block';
                dropdown.value = "";
            } else {
                input.style.display = 'none';
                input.value = selectedDropdownValue;
            }

            dropdown.addEventListener('change', () => {
                if (dropdown.value === "") {
                    input.style.display = 'block';
                } else {
                    input.style.display = 'none';
                    input.value = dropdown.value;
                }
            });

            // ...existing play/pause icon code...

            const buttonRow = document.createElement('div');
            buttonRow.className = 'audio-url-buttons';

            const playIcon = document.createElement('span');
            playIcon.innerHTML = '▶';
            playIcon.className = 'icon play-icon';
            playIcon.title = 'Play';
            playIcon.addEventListener('click', () => {
                const audioUrl = input.value.trim();
                if (audioUrl) {
                    const iframe = document.createElement('iframe');
                    iframe.src = audioUrl;
                    iframe.allow = 'autoplay';
                    iframe.style.display = 'none';
                    document.body.appendChild(iframe);
                    testAudioIframes[stage] = iframe;
                } else {
                    alert('Please enter a valid audio URL.');
                }
            });

            const pauseIcon = document.createElement('span');
            pauseIcon.innerHTML = '&#10074;&#10074;';
            pauseIcon.className = 'icon pause-icon';
            pauseIcon.title = 'Pause';
            pauseIcon.addEventListener('click', () => {
                if (testAudioIframes[stage]) {
                    testAudioIframes[stage].remove();
                    delete testAudioIframes[stage];
                }
            });

            buttonRow.appendChild(playIcon);
            buttonRow.appendChild(pauseIcon);

            container.appendChild(label);
            container.appendChild(dropdown);
            container.appendChild(input);
            container.appendChild(buttonRow);

            audioUrlsContainer.appendChild(container);
        });
    });
}
function loadSlaColorProfiles() {
    chrome.storage.sync.get(['slaColorProfiles'], (data) => {
        const profiles = data.slaColorProfiles || {};
        document.querySelectorAll('.sla-color-profile').forEach(profileDiv => {
            const stage = profileDiv.dataset.stage;
            const profile = profiles[stage];
            if (profile) {
                // Gradient stages
                if (profile.colors) {
                    profileDiv.querySelectorAll('.sla-color-picker').forEach(input => {
                        const idx = input.dataset.color;
                        if (profile.colors[idx]) {
                            input.value = rgbToHex(profile.colors[idx]);
                        }
                    });
                }
                // Static color stages
                if (profile.color) {
                    const staticInput = profileDiv.querySelector('.sla-static-color-picker');
                    if (staticInput) staticInput.value = rgbToHex(profile.color);
                }
                // Alpha
                const alphaInput = profileDiv.querySelector('.sla-alpha, .sla-static-alpha');
                if (alphaInput && profile.alpha !== undefined) {
                    alphaInput.value = profile.alpha;
                }
            }
        });
    });
}

// --- Save to storage ---
function saveSlaColorProfiles() {
    const profiles = {};
    document.querySelectorAll('.sla-color-profile').forEach(profileDiv => {
        const stage = profileDiv.dataset.stage;
        // Gradient stages
        const colorPickers = profileDiv.querySelectorAll('.sla-color-picker');
        if (colorPickers.length) {
            const colors = [];
            colorPickers.forEach(input => {
                const idx = input.dataset.color;
                colors[idx] = hexToRgb(input.value);
            });
            // Set static thresholds for gradient stages
            let thresholds = [];
            if (stage === "Assessment") thresholds = [0, 30, 55];
            else if (stage === "Awaiting Analyst") thresholds = [0, 5, 12];
            profiles[stage] = { thresholds, colors, alpha: 0.33 };
        }
        // Static color stages
        const staticColor = profileDiv.querySelector('.sla-static-color-picker');
        if (staticColor) {
            const color = hexToRgb(staticColor.value);
            profiles[stage] = { color, alpha: 0.33 };
        }
    });
    chrome.storage.sync.set({ slaColorProfiles: profiles }, () => {
        document.getElementById('sla-colors-status-message').textContent = 'SLA color profiles saved!';
        setTimeout(() => {
            document.getElementById('sla-colors-status-message').textContent = '';
        }, 2000);
        chrome.tabs && chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: 'updateSlaColorProfiles', slaColorProfiles: profiles });
        });
    });
}
// --- Event Listeners ---
// Save audio URLs
saveAudioUrlsButton.addEventListener('click', () => {
    const audioUrls = {};
    const inputs = audioUrlsContainer.querySelectorAll('input[type="text"]');
    inputs.forEach(input => {
        const stage = input.id.replace('audio-url-', '').replace(/-/g, ' ');
        audioUrls[stage] = input.value.trim();
    });
    chrome.storage.sync.set({ alertAudioUrls: audioUrls }, () => {
        log('Alert audio URLs saved:', 2, audioUrls);
    });
    const statusMessage = document.getElementById('audio-urls-status-message');
    statusMessage.textContent = 'Audio URLs saved.';
    setTimeout(() => {
        statusMessage.textContent = '';
    }, 2000);
});

document.addEventListener('DOMContentLoaded', () => {
    loadPopupValues();
    loadHighlightColumns();
    loadSlaColorProfiles();

    // Tab switching logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
        });
    });

    // Select All Columns
    const selectAllBtn = document.getElementById('select-all-columns');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            const container = document.getElementById('highlight-columns-container');
            const checkboxes = container.querySelectorAll('input[type="checkbox"]');
            const disableSeverity = disableSeverityCheckbox && disableSeverityCheckbox.checked === false;
            checkboxes.forEach(cb => {
                if (disableSeverity && cb.value.trim().toLowerCase() === 'severity') {
                    cb.checked = false;
                } else {
                    cb.checked = true;
                }
            });
            const checked = Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.value);
            chrome.storage.sync.set({ highlightColumns: checked });
        });
    }

    // Deselect All Columns
    const deselectAllBtn = document.getElementById('deselect-all-columns');
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', () => {
            const container = document.getElementById('highlight-columns-container');
            const checkboxes = container.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = false);
            chrome.storage.sync.set({ highlightColumns: [] });
        });
    }
    // Collapse logic for SLA color profiles
    document.querySelectorAll('.collapse-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const content = this.parentElement.querySelector('.collapse-content');
            const expanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', !expanded);
            this.textContent = (expanded ? '▶ ' : '▼ ') + this.textContent.replace(/^. /, '').replace(/^▶ |^▼ /, '');
            content.style.display = expanded ? 'none' : 'flex';
        });
    });
    // Version number
    const versionSpan = document.getElementById('version-number');
    if (versionSpan && chrome.runtime && chrome.runtime.getManifest) {
        const manifest = chrome.runtime.getManifest();
        if (manifest && manifest.version) {
            versionSpan.textContent = `v${manifest.version}`;
        }
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
        }, 5000);
    } else {
        intervalStatusMessage.classList.add('error');
        intervalStatusMessage.textContent = 'Interval must be at least 20 seconds.';
        setTimeout(() => {
            intervalStatusMessage.textContent = '';
            intervalStatusMessage.classList.remove('error');
        }, 5000);
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


document.addEventListener('DOMContentLoaded', () => {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
        });
    });
});

if (disableTooltipsCheckbox) {
    disableTooltipsCheckbox.addEventListener('change', () => {
        chrome.storage.sync.set({ disableTooltips: disableTooltipsCheckbox.checked });
    });
}
if (hideEmptyAwarenessCheckbox) {
    hideEmptyAwarenessCheckbox.addEventListener('change', () => {
        chrome.storage.sync.set({ hideEmptyAwareness: hideEmptyAwarenessCheckbox.checked });
    });
}