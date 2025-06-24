const numberKey = 'matchingNumber';
var debugLogLevel = 0;

function log(message, level = 3, ...args) {
    if (debugMode && debugLogLevel >= level) {
        console.log(`SLTool: ${message}`, ...args);
    }
}

chrome.runtime.onInstalled.addListener(() => {
    const numberKey = 'matchingNumber';

    chrome.runtime.onInstalled.addListener(() => {
        chrome.storage.sync.set({ [numberKey]: 30 });
        log('Extension installed and default settings applied.');
    });
});
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get(['disableFlashing'], (data) => {
        if (data.disableFlashing === undefined) {
            chrome.storage.sync.set({ disableFlashing: false });
        }
    });
});