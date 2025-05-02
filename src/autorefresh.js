const RefreshBtn = "/html/body/app-root/div/div/div/div/ui-view/app-search/div/div[1]/ngx-toolbar/header/div[2]/ngx-toolbar-content/div[2]/ngx-button[1]/button";
const Search = "/html/body/div/div/div/div/div[3]/do-condition-builder";
const Filter = "/html/body/app-root/div/div/div/div/ui-view/app-search/div/div[2]/div[2]/app-search-list/div[2]/app-search-list-columns/div/ngx-dropdown";

let refreshInterval = 20; // Default refresh interval (in seconds)
let refreshIntervalId = null;
let autoRefreshEnabled = false; // Default to disabled

// Load the saved values for Auto-Refresh when the script initializes
chrome.storage.sync.get(['refreshInterval', 'autoRefresh'], (data) => {
    if (data.refreshInterval) {
        refreshInterval = parseInt(data.refreshInterval, 10);
        console.log('SLTool: Loaded refresh interval:', refreshInterval);
    }
    if (data.autoRefresh !== undefined) {
        autoRefreshEnabled = data.autoRefresh;
        console.log('SLTool: Loaded Auto-Refresh state:', autoRefreshEnabled);
        if (autoRefreshEnabled) {
            startAutoRefresh();
        }
    }
});

function triggerRefreshButton() {
    // Check if the Search element is visible
    const searchResult = document.evaluate(Search, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const searchElement = searchResult.singleNodeValue;

    if (searchElement) {
        const isVisible = searchElement.offsetParent !== null || searchElement.getClientRects().length > 0;

        if (isVisible) {
            console.log("SLTool: Search element is visible. Skipping refresh.");
            return;
        }
    } else {
        // console.log("SLTool: Search element not found.");
    }

    // Check if the Filter element has the 'open' class
    const filterResult = document.evaluate(Filter, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const filterElement = filterResult.singleNodeValue;

    if (filterElement && filterElement.classList.contains('open')) {
        console.log("SLTool: Filter is active (open). Skipping refresh.");
        return;
    }

    const result = document.evaluate(RefreshBtn, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const refreshButton = result.singleNodeValue;

    if (refreshButton) {
        refreshButton.click();
        console.log("SLTool: Auto-refreshing...");
    } else {
        console.error("SLTool: Refresh button not found.");
    }
}

// Function to start the Auto-Refresh
function startAutoRefresh() {
    if (refreshIntervalId) {
        clearInterval(refreshIntervalId); // Clear any existing interval to avoid duplicates
    }

    refreshIntervalId = setInterval(triggerRefreshButton, refreshInterval * 1000);
    console.log('SLTool: Auto-Refresh started with interval:', refreshInterval, 'seconds.');
}

// Function to stop the Auto-Refresh
function stopAutoRefresh() {
    if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
        refreshIntervalId = null;
        console.log('SLTool: Auto-Refresh stopped.');
    }
}

// Listener for messages from the popup to update the refresh interval and Auto-Refresh state
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateInterval") {
        refreshInterval = parseInt(request.interval, 10);
        console.log('SLTool: Updated refresh interval:', refreshInterval);
        if (autoRefreshEnabled) {
            startAutoRefresh();
        }
        sendResponse({ status: "success" });
    }
    if (request.action === "updateAutoRefresh") {
        autoRefreshEnabled = request.enabled;
        console.log('SLTool: Updated Auto-Refresh state:', autoRefreshEnabled);
        if (autoRefreshEnabled) {
            startAutoRefresh();
        } else {
            stopAutoRefresh();
        }
        sendResponse({ status: "success" });
    }
});