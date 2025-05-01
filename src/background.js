const numberKey = 'matchingNumber';

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ [numberKey]: 30 });

    chrome.contentSettings['media-stream'].set({
        primaryPattern: 'https://sec-ops.cybanetix.com',
        setting: 'allow'
    }, () => {
        console.log('Autoplay permission requested.');
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getMatchingNumber') {
        chrome.storage.sync.get([numberKey], (result) => {
            sendResponse({ matchingNumber: result[numberKey] });
        });
        return true; 
    }

    if (request.action === 'setMatchingNumber') {
        chrome.storage.sync.set({ [numberKey]: request.value }, () => {
            sendResponse({ success: true });
        });
        return true; 
    }
});