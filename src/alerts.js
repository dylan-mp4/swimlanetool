// State variables
let currentCases = [];
let caseAlertAudioPlayed = {};
let isAudioPlaying = false;
let initialLoadComplete = false;
var debugMode = false;
var debugLogLevel = 0;
let currentAudioIframe = null; // Track the current audio iframe
let alertsEnabled = false;
let alertStages = [];
let alertAudioUrls = {};

// Load debug settings
chrome.storage.sync.get(['debugMode', 'debugLogLevel', 'alertsEnabled', 'alertStages', 'alertAudioUrls'], (data) => {
    debugMode = !!data.debugMode;
    debugLogLevel = parseInt(data.debugLogLevel, 10) || 0;
    alertsEnabled = data.alertsEnabled || false;
    alertStages = data.alertStages || ["Awaiting Analyst", "Assessment", "Analyst Follow Up", "Response Received"];
    alertAudioUrls = data.alertAudioUrls || {};
    log('Loaded debug settings', 3, { debugMode, debugLogLevel });
});

// Initialize the application
window.addEventListener('load', () => {
    setTimeout(() => {
        log("Starting initial case indexing...", 3);
        indexInitialCases();

        log("Starting periodic case checks...", 3);
        setInterval(checkForNewCases, 5000);
    }, 20000);

    // Stop audio on user interaction
    ['click', 'keydown', 'touchstart'].forEach(eventType => {
        window.addEventListener(eventType, stopAudioOnInteraction);
    });
});

// Index initial cases without triggering alerts
function indexInitialCases() {
    try {
        const rows = getRowElements();
        if (!rows.length) {
            log("No rows found during initial indexing.", 3);
            return;
        }

        rows.forEach(row => {
            const trackingId = getCellValue(row, "Tracking Id");
            if (trackingId && !currentCases.includes(trackingId)) {
                currentCases.push(trackingId);
                caseAlertAudioPlayed[trackingId] = true;
            }
        });

        log(`Initial indexing complete. Indexed ${currentCases.length} cases.`, 3);
        initialLoadComplete = true;
    } catch (error) {
        log("Error during initial indexing", 1, error);
    }
}

// Periodically check for new or updated cases
function checkForNewCases() {
    try {
        const rows = getRowElements();
        if (!rows.length) {
            log("No rows found during periodic check.", 3);
            return;
        }

        rows.forEach(row => {
            const trackingId = getCellValue(row, "Tracking Id");
            const caseStage = getCellValue(row, "Case Stage");

            if (!trackingId || !caseStage) return;

            if (!currentCases.includes(trackingId)) {
                handleNewCase(trackingId, caseStage);
            } else {
                handleCaseStage(caseStage, trackingId);
            }
        });
    } catch (error) {
        log("Error during periodic case check", 1, error);
    }
}

// Handle new cases
function handleNewCase(trackingId, caseStage) {
    currentCases.push(trackingId);
    log(`New case detected: Tracking Id ${trackingId}, Stage: ${caseStage}`, 2);

    if (initialLoadComplete) {
        handleCaseStage(caseStage, trackingId);
    }
}

// Handle case stage changes
// Handle case stage changes
function handleCaseStage(caseStage, trackingId) {
    if (!alertsEnabled) {
        log('Alerts are disabled. Skipping alert.', 3);
        return;
    }

    if (isAudioPlaying) {
        log(`Audio is already playing. Skipping alert for case ${trackingId}.`, 3);
        return;
    }

    if (alertStages.includes(caseStage) && !caseAlertAudioPlayed[trackingId]) {
        const audioUrl = alertAudioUrls[caseStage] || "https://www.youtube-nocookie.com/embed/V2QUYX0DjVA?autoplay=1&mute=0";
        log(`Case ${trackingId} is in stage: ${caseStage}`, 2);
        playAudio(audioUrl, trackingId);
    } else {
        log(`Unhandled or already alerted stage for case ${trackingId}: ${caseStage}`, 2);
    }
}

// Get audio URL based on case stage
function getAudioUrlForStage(caseStage) {
    const audioUrl = "https://www.youtube-nocookie.com/embed/V2QUYX0DjVA?autoplay=1&mute=0";
    const stagesWithAudio = ["Awaiting Analyst", "Assessment", "Analyst Follow Up", "Response Received"];
    return stagesWithAudio.includes(caseStage) ? audioUrl : null;
}

// Play audio for a specific case
function playAudio(audioUrl, trackingId) {
    if (isAudioPlaying) return;

    isAudioPlaying = true;

    const audioElement = document.createElement('audio');
    audioElement.src = audioUrl;
    audioElement.autoplay = true;
    audioElement.style.display = 'none';

    audioElement.addEventListener('ended', () => {
        stopAudio();
    });

    document.body.appendChild(audioElement);
    currentAudioIframe = audioElement; // Track the audio element

    caseAlertAudioPlayed[trackingId] = true;
}

// Stop audio playback
function stopAudio() {
    if (currentAudioIframe) {
        currentAudioIframe.remove();
        currentAudioIframe = null;
    }
    isAudioPlaying = false;
}

// Stop audio on user interaction
function stopAudioOnInteraction() {
    if (isAudioPlaying) {
        log("User interaction detected. Stopping audio playback.", 3);
        stopAudio();
    }
}

// Utility to get table rows
function getRowElements() {
    const table = queryDeep('ngx-datatable');
    return table ? Array.from(table.querySelectorAll('datatable-body-row')) : [];
}

// Utility to get cell value by header name
function getCellValue(rowElem, headerName) {
    const cell = getCellByHeader(rowElem, headerName);
    return cell ? cell.textContent.trim() : null;
}

// Logging utility
function log(message, level = 3, ...args) {
    if (debugMode && debugLogLevel >= level) {
        console.log(`SLTool: ${message}`, ...args);
    }
}

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
        if (changes.debugMode) {
            debugMode = !!changes.debugMode.newValue;
            log('Updated debugMode:', 3, debugMode);
        }
        if (changes.debugLogLevel) {
            debugLogLevel = parseInt(changes.debugLogLevel.newValue, 10) || 0;
            log('Updated debugLogLevel:', 3, debugLogLevel);
        }
        if (changes.alertsEnabled) {
            alertsEnabled = changes.alertsEnabled.newValue;
            log('Updated alertsEnabled:', 3, alertsEnabled);
        }
        if (changes.alertStages) {
            alertStages = changes.alertStages.newValue || [];
            log('Updated alertStages:', 3, alertStages);
        }
        if (changes.alertAudioUrls) {
            alertAudioUrls = changes.alertAudioUrls.newValue || {};
            log('Updated alertAudioUrls:', 3, alertAudioUrls);
        }
    }
});