// const TotalCount = "/html/body/app-root/div/div/div/div/ui-view/app-search/div/div[2]/div[2]/app-search-list/div[2]/ngx-datatable/div/datatable-footer/div/div/text()";
const TotalCount = "/html/body/app-root/div/div/div/div/app-search/div/div[2]/div[2]/app-search-list/div[2]/ngx-datatable/div/datatable-footer/div/div/text()";
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

function checkNumber() {
    if (!doomModeEnabled) {
        log('Doom Mode is disabled. Skipping', 4);
        return;
    }

    const result = document.evaluate(TotalCount, document, null, XPathResult.STRING_TYPE, null);
    const text = result.stringValue.trim();

    const match = text.match(/\d+/);
    if (match) {
        const number = parseInt(match[0], 10);
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
        log("No number found in the text.", 4);
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

// Listener for messages from the popup to update Doom Mode
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateDoomMode") {
        doomModeEnabled = request.enabled;
        log('Updated Doom Mode state:', 3, doomModeEnabled);
        sendResponse({ status: "success" });
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

// Start checking the number 5 seconds after the page loads
window.addEventListener('load', () => {
    setTimeout(checkNumber, 10000);
});