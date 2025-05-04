const numberKey = 'matchingNumber';
function log(message) {
    console.log(`SLTool: ${message}`);
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