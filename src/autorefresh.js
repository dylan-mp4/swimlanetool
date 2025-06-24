const RefreshBtn = "/html/body/app-root/div/div/div/div/app-search/div/div[1]/ngx-toolbar/header/div[2]/ngx-toolbar-content/div[2]/ngx-button[1]/button";
const Search = "/html/body/div/div/div/div/div[3]/do-condition-builder";
const Filter = "/html/body/app-root/div/div/div/div/app-search/div/div[2]/div[2]/app-search-list/div[2]/app-search-list-columns/div/ngx-dropdown";

let refreshInterval = 20; // Default refresh interval (in seconds)
let refreshIntervalId = null;
let autoRefreshEnabled = false; // Default to disabled
var debugMode = false;
var debugLogLevel = 0;

function log(message, level = 3, ...args) {
    if (debugMode && debugLogLevel >= level) {
        console.log(`SLTool: ${message}`, ...args);
    }
}

// Load the saved values for Auto-Refresh when the script initializes
chrome.storage.sync.get(['refreshInterval', 'autoRefresh', 'debugMode', 'debugLogLevel'], (data) => {
    if (data.refreshInterval) {
        refreshInterval = parseInt(data.refreshInterval, 10);
        log('Loaded refresh interval:', 2, refreshInterval);
    }
    if (data.autoRefresh !== undefined) {
        autoRefreshEnabled = data.autoRefresh;
        log('Loaded Auto-Refresh state:', 2, autoRefreshEnabled);
        if (autoRefreshEnabled) {
            startAutoRefresh();
        }
    }
    if (data.debugMode !== undefined) {
        debugMode = !!data.debugMode;
        log('Loaded debug mode state:', 2, debugMode);
    }
    if (data.debugLogLevel !== undefined) {
        debugLogLevel = parseInt(data.debugLogLevel, 10);
        log('Loaded debug log level:', 3, debugLogLevel);
    }
});

function triggerRefreshButton() {
    // Check if the Search element is visible
    const searchResult = document.evaluate(Search, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const searchElement = searchResult.singleNodeValue;
    const appRecordElem = document.querySelector('app-record');
    if (appRecordElem && (appRecordElem.offsetParent !== null || appRecordElem.getClientRects().length > 0)) {
        log("<app-record> element is visible. Skipping refresh.", 2);
        return;
    }

    if (searchElement) {
        const isVisible = searchElement.offsetParent !== null || searchElement.getClientRects().length > 0;

        if (isVisible) {
            log("Search element is visible. Skipping refresh.", 2);
            return;
        }
    } else {
        log("Search element not found.", 3);
    }

    // Check if the Filter element has the 'open' class
    const filterResult = document.evaluate(Filter, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const filterElement = filterResult.singleNodeValue;

    if (filterElement && filterElement.classList.contains('open')) {
        log("Filter is active (open). Skipping refresh.", 3);
        return;
    }
    const progressXPath = '/html/body/app-root/div/div/div/div/app-search/div/div[2]/div[2]/app-search-list/div/ngx-datatable/div/datatable-body/datatable-progress';
    const progressElem = document.evaluate(progressXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    let progressVisible = false;

    if (progressElem && (progressElem.offsetParent !== null || progressElem.getClientRects().length > 0)) {
        progressVisible = true;
    } else {
        // Fallback: check for <datatable-progress> with role="progressbar"
        const progressBarElem = document.querySelector('datatable-progress[role="progressbar"], datatable-progress .progress-linear[role="progressbar"]');
        if (progressBarElem && (progressBarElem.offsetParent !== null || progressBarElem.getClientRects().length > 0)) {
            progressVisible = true;
        }
    }

    if (progressVisible) {
        log("Refresh is currently in progress. Skipping.", 1);
        return;
    }
    const result = document.evaluate(RefreshBtn, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const refreshButton = result.singleNodeValue;

    if (refreshButton) {
        refreshButton.click();
        log("Auto-refreshing...", 2);
    } else {
        log("Error: Refresh button not found.", 1);
    }
}

// Function to start the Auto-Refresh
function startAutoRefresh() {
    if (refreshIntervalId) {
        clearInterval(refreshIntervalId); // Clear any existing interval to avoid duplicates
    }

    refreshIntervalId = setInterval(triggerRefreshButton, refreshInterval * 1000);
    log('Auto-Refresh started with interval:', 2, refreshInterval, 'seconds.');
}

// Function to stop the Auto-Refresh
function stopAutoRefresh() {
    if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
        refreshIntervalId = null;
        log('Auto-Refresh stopped.', 2);
    }
}

// Listener for messages from the popup to update the refresh interval and Auto-Refresh state
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateInterval") {
        refreshInterval = parseInt(request.interval, 10);
        log('Updated refresh interval:', 2, refreshInterval);
        if (autoRefreshEnabled) {
            startAutoRefresh();
        }
        sendResponse({ status: "success" });
    }
    if (request.action === "updateAutoRefresh") {
        autoRefreshEnabled = request.enabled;
        log('Updated Auto-Refresh state:', 2, autoRefreshEnabled);
        if (autoRefreshEnabled) {
            startAutoRefresh();
        } else {
            stopAutoRefresh();
        }
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