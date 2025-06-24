//Debugging and logging setup
var debugMode = false;
var debugLogLevel = 0;

function log(message, level = 3, ...args) {
    if (debugMode && debugLogLevel >= level) {
        console.log(`SLTool: ${message}`, ...args);
    }
}

chrome.storage.sync.get(['debugMode', 'debugLogLevel'], (data) => {
    if (data.debugMode !== undefined) {
        debugMode = !!data.debugMode;
        log('Loaded debug mode state:', 2, debugMode);
    }
    if (data.debugLogLevel !== undefined) {
        debugLogLevel = parseInt(data.debugLogLevel, 10);
        log('Loaded debug log level:', 3, debugLogLevel);
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

function addrecordDataButton() {
    // XPath to the h2 element
    const h2XPath = '/html/body/app-root/div/div/div/div/app-search/app-record/div/ngx-toolbar/header/div[1]/ngx-toolbar-title/h2';
    const h2Elem = document.evaluate(h2XPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (!h2Elem) {
        log('Toolbar h2 not found', 4);
        return;
    }

    // Avoid adding the buttons multiple times
    if (document.getElementById('log-record-data-btn') || document.getElementById('send-to-desktop-btn')) return;

    // Create the Log Record Data button
    const logBtn = document.createElement('button');
    logBtn.id = 'log-record-data-btn';
    logBtn.textContent = 'Log Record Data';
    logBtn.style.marginLeft = '12px';
    logBtn.className = 'btn btn-link';

    logBtn.addEventListener('click', () => {
        // Find all custom-component-* elements and log the first non-empty context-data
        const elements = Array.from(document.querySelectorAll('*')).filter(
            el => el.tagName.toLowerCase().startsWith('custom-component-')
        );
        for (let idx = 0; idx < elements.length; idx++) {
            const el = elements[idx];
            const recordData = el.getAttribute('record');
            if (recordData && recordData.trim() !== '') {
                try {
                    const parsed = JSON.parse(recordData);
                    console.log(`custom-component #${idx} record:`, parsed);
                } catch (e) {
                    console.log(`custom-component #${idx} record (invalid JSON):`, recordData);
                }
                return; // Only print the first non-empty one
            }
        }
        console.log('No non-empty custom-component record found.');
    });

    // Create the Send to Desktop button
    const sendBtn = document.createElement('button');
    sendBtn.id = 'send-to-desktop-btn';
    sendBtn.textContent = 'Send to Desktop';
    sendBtn.style.marginLeft = '8px';
    sendBtn.className = 'btn btn-link';

    sendBtn.addEventListener('click', () => {
        // Find the first non-empty custom-component-* record
        const elements = Array.from(document.querySelectorAll('*')).filter(
            el => el.tagName.toLowerCase().startsWith('custom-component-')
        );
        for (let idx = 0; idx < elements.length; idx++) {
            const el = elements[idx];
            const recordData = el.getAttribute('record');
            if (recordData && recordData.trim() !== '') {
                try {
                    const parsed = JSON.parse(recordData);
                    // Extract required keys
                    const payload = {
                        'original-event': parsed['original-event'],
                        'alert-title': parsed['alert-title'],
                        'case-url-link': parsed['case-url-link'],
                        'organization': parsed['organization'],
                        'all-data': parsed
                    };
                    // Send to desktop application (example using fetch to localhost)
                    fetch('http://localhost:5000/receive', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    })
                    .then(response => {
                        if (response.ok) {
                            console.log('Data sent to desktop application:', payload);
                        } else {
                            console.error('Failed to send data to desktop application');
                        }
                    })
                    .catch(err => {
                        console.error('Error sending data to desktop application:', err);
                    });
                } catch (e) {
                    console.log(`custom-component #${idx} record (invalid JSON):`, recordData);
                }
                return; // Only send the first non-empty one
            }
        }
        console.log('No non-empty custom-component record found.');
    });

    // Insert the buttons after the h2
    h2Elem.parentNode.insertBefore(logBtn, h2Elem.nextSibling);
    h2Elem.parentNode.insertBefore(sendBtn, logBtn.nextSibling);
}

// Try to add the button periodically in case the DOM loads late
setInterval(addrecordDataButton, 1000);