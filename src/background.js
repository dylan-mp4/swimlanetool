const numberKey = 'matchingNumber';

chrome.runtime.onInstalled.addListener(() => {
    const numberKey = 'matchingNumber';

    chrome.runtime.onInstalled.addListener(() => {
        chrome.storage.sync.set({ [numberKey]: 30 });
        console.log('SLTool: Extension installed and default settings applied.');
    });
});
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get(['disableFlashing'], (data) => {
        if (data.disableFlashing === undefined) {
            chrome.storage.sync.set({ disableFlashing: false });
        }
    });
});