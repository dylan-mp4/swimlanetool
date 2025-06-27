let audioPlayed = false;
let userDefinedNumber = 100; // Default value
let doomModeEnabled = false; // Default to disabled
var debugMode = false;
var debugLogLevel = 0;

function log(message, level = 3, ...args) {
    if (debugMode && debugLogLevel >= level) {
        console.log(`SLTool: ${message}`, ...args);
    }
}

// Load the saved values for Doom Mode when the script initializes
chrome.storage.sync.get(['matchingNumber', 'doomMode', 'debugMode', 'debugLogLevel'], (data) => {
    if (data.matchingNumber) {
        userDefinedNumber = parseInt(data.matchingNumber, 10);
        log('Loaded user-defined number:', 3, userDefinedNumber);
    }
    if (data.doomMode !== undefined) {
        doomModeEnabled = data.doomMode;
        log('Loaded Doom Mode state:', 3, doomModeEnabled);
    }
    if (data.debugMode !== undefined) {
        debugMode = !!data.debugMode;
        log('Loaded debug mode state:', 3, debugMode);
    }
    if (data.debugLogLevel !== undefined) {
        debugLogLevel = parseInt(data.debugLogLevel, 10);
        log('Loaded debug log level:', 3, debugLogLevel);
    }
});

function getCountOfTrackingId() {
    // Find all custom components (shadow roots)
    const elements = Array.from(document.querySelectorAll('*')).filter(
        el => el.tagName.toLowerCase().startsWith('custom-component-')
    );
    for (const el of elements) {
        const reportAttr = el.getAttribute('report');
        if (reportAttr) {
            try {
                const report = JSON.parse(reportAttr);
                if (report.data && Array.isArray(report.data)) {
                    const countObj = report.data.find(d => d.name === "Count of Tracking Id");
                    if (countObj && countObj.series && Array.isArray(countObj.series)) {
                        const seriesObj = countObj.series.find(s => s.name === "Success");
                        if (seriesObj && typeof seriesObj.value === "number") {
                            return seriesObj.value;
                        }
                    }
                }
            } catch (e) {
                log("Failed to parse report JSON", 2, e);
            }
        }
    }
    return null;
}

function checkNumber() {
    if (!doomModeEnabled) {
        log('Doom Mode is disabled. Skipping', 4);
        return;
    }

    const number = getCountOfTrackingId();

    if (typeof number === "number") {
        if (number > userDefinedNumber && number <= 100 && !audioPlayed) {
            log("INIATING DOOM MODE", 1, number);
            playAudio();
            audioPlayed = true;
        } else if (number <= userDefinedNumber) {
            log("EVERYTHING IS FINE", 3, number);
            setTimeout(checkNumber, 5000);
        } else if (number > 100) {
            log("Number is greater than 100. (Preventative Measure)", 2, number);
            setTimeout(checkNumber, 5000);
        }
    } else {
        log("No count of tracking id found.", 4);
        setTimeout(checkNumber, 5000);
    }
}

function playAudio() {
    const iframe = document.createElement('iframe');
    iframe.src = "https://www.youtube-nocookie.com/embed/kpnW68Q8ltc?autoplay=1&mute=0";
    iframe.allow = "autoplay";
    iframe.style.display = "none";
    document.body.appendChild(iframe);
}
function stopAudio() {
    const iframes = document.querySelectorAll('iframe[src*="youtube-nocookie"]');
    iframes.forEach(iframe => {
        iframe.remove();
    });
    audioPlayed = false;
}

// Listener for messages from the popup to update Doom Mode
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateDoomMode") {
        doomModeEnabled = request.enabled;
        log('Updated Doom Mode state:', 3, doomModeEnabled);
        sendResponse({ status: "success" });
        if (!doomModeEnabled) {
            stopAudio(); // Stop audio if Doom Mode is disabled
        }
    }
});

chrome.storage.onChanged.addListener((changes) => {
    if (changes.debugMode) {
        debugMode = !!changes.debugMode.newValue;
        log('Debug mode changed:', 2, debugMode);
    }
    if (changes.debugLogLevel) {
        debugLogLevel = parseInt(changes.debugLogLevel.newValue, 10);
        log('Debug log level changed:', 2, debugLogLevel);
    }
});

// Start checking the number 10 seconds after the page loads
window.addEventListener('load', () => {
    setTimeout(checkNumber, 10000);
});