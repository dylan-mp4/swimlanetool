const TotalCount = "/html/body/app-root/div/div/div/div/ui-view/app-search/div/div[2]/div[2]/app-search-list/div[2]/ngx-datatable/div/datatable-footer/div/div/text()";
const RefreshBtn = "/html/body/app-root/div/div/div/div/ui-view/app-search/div/div[1]/ngx-toolbar/header/div[2]/ngx-toolbar-content/div[2]/ngx-button[1]/button";

let audioPlayed = false;
let userDefinedNumber = 30; // Default value
let refreshInterval = 10; // Default refresh interval (in seconds)
let refreshIntervalId;
let doomModeEnabled = false; // Default to disabled
let autoRefreshEnabled = true; // Default to enabled


// Load the saved values from storage when the content script initializes
chrome.storage.sync.get(['matchingNumber', 'refreshInterval', 'doomMode', 'autoRefresh'], (data) => {
    if (data.matchingNumber) {
        userDefinedNumber = parseInt(data.matchingNumber, 10);
        console.log('Loaded user-defined number:', userDefinedNumber);
    }
    if (data.refreshInterval) {
        refreshInterval = parseInt(data.refreshInterval, 10);
        console.log('Loaded refresh interval:', refreshInterval);
        if (autoRefreshEnabled) {
            startRefreshInterval();
        }
    }
    if (data.doomMode !== undefined) {
        doomModeEnabled = data.doomMode;
        console.log('Loaded Doom Mode state:', doomModeEnabled);
    }
    if (data.autoRefresh !== undefined) {
        autoRefreshEnabled = data.autoRefresh;
        console.log('Loaded Auto-Refresh state:', autoRefreshEnabled);
    }
});

function checkNumber() {

    if (!doomModeEnabled) {
        console.log('Doom Mode is disabled. Skipping');
        return;
    }

    const result = document.evaluate(TotalCount, document, null, XPathResult.STRING_TYPE, null);
    const text = result.stringValue.trim();

    const match = text.match(/\d+/);
    if (match) {
        const number = parseInt(match[0], 10);
        if (number > userDefinedNumber && !audioPlayed) {
            console.log("INIATING DOOM MODE", number);
            playAudio();
            audioPlayed = true;
        } else if (number <= userDefinedNumber) {
            console.log("EVERYTHING IS FINE", number);
            setTimeout(checkNumber, 5000);
        }
    } else {
        console.log("No number found in the text.");
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

function triggerRefreshButton() {
    const result = document.evaluate(RefreshBtn, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const refreshButton = result.singleNodeValue;

    if (refreshButton) {
        refreshButton.click();
        console.log("Refresh button clicked.");
    } else {
        console.log("Refresh button not found.");
    }
}

function startRefreshInterval() {
    if (!autoRefreshEnabled) {
        console.log('Auto-Refresh is disabled. Skipping refresh interval.');
        return;
    }

    if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
    }
    refreshIntervalId = setInterval(triggerRefreshButton, refreshInterval * 1000);
}

// Listeners for messages from the popup to update the refresh interval and doom mode
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateInterval") {
        refreshInterval = parseInt(request.interval, 10);
        console.log('Updated refresh interval:', refreshInterval);
        startRefreshInterval();
        sendResponse({ status: "success" });
    }
});
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateDoomMode") {
        doomModeEnabled = request.enabled;
        console.log('Updated Doom Mode state:', doomModeEnabled);
        sendResponse({ status: "success" });
    }
});
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateAutoRefresh") {
        autoRefreshEnabled = request.enabled;
        console.log('Updated Auto-Refresh state:', autoRefreshEnabled);
        if (autoRefreshEnabled) {
            startRefreshInterval();
        } else if (refreshIntervalId) {
            clearInterval(refreshIntervalId);
        }
        sendResponse({ status: "success" });
    }
});

// Start checking the number 5 seconds after the page loads
window.addEventListener('load', () => {
    setTimeout(checkNumber, 5000);
});