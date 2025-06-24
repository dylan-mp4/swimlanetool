//Debugging and logging setup
var debugMode = false;
var debugLogLevel = 0;
let developerSettingsEnabled = false;

function log(message, level = 3, ...args) {
    if (debugMode && debugLogLevel >= level) {
        console.log(`SLTool: ${message}`, ...args);
    }
}

chrome.storage.sync.get(['debugMode', 'debugLogLevel','developerSettingsEnabled'], (data) => {
    if (data.debugMode !== undefined) {
        debugMode = !!data.debugMode;
        log('Loaded debug mode state:', 2, debugMode);
    }
    if (data.debugLogLevel !== undefined) {
        debugLogLevel = parseInt(data.debugLogLevel, 10);
        log('Loaded debug log level:', 3, debugLogLevel);
    }
    if (data.developerSettingsEnabled !== undefined) {
        developerSettingsEnabled = !!data.developerSettingsEnabled;
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
    if (changes.developerSettingsEnabled) {
        developerSettingsEnabled = !!changes.developerSettingsEnabled.newValue;
    }
});

function addSendToDesktopButton() {
    // XPath to the h2 element
    const h2XPath = '/html/body/app-root/div/div/div/div/app-search/app-record/div/ngx-toolbar/header/div[1]/ngx-toolbar-title/h2';
    const h2Elem = document.evaluate(h2XPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (!h2Elem) {
        log('Toolbar h2 not found', 4);
        return;
    }

    // Avoid adding the button multiple times
    if (document.getElementById('send-to-desktop-btn')) return;

    // Create the Send to Desktop button
    const sendBtn = document.createElement('button');
    sendBtn.id = 'send-to-desktop-btn';
    sendBtn.textContent = 'Open in CaseBuilder';
    sendBtn.style.marginLeft = '8px';
    sendBtn.style.fontSize = '13px';
    sendBtn.className = 'btn btn-primary ngx-button btn-primary-gradient';
    sendBtn.style.paddingLeft = '12px';
    sendBtn.style.paddingRight = '12px';
    sendBtn.style.verticalAlign = 'middle';
    sendBtn.style.display = 'inline-flex';
    sendBtn.style.alignItems = 'center';
    sendBtn.style.marginBottom = '5px';

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
                            log('Data sent to desktop application:', 2, payload);
                        } else {
                            log('Failed to send data to desktop application',1);
                        }
                    })
                    .catch(err => {
                        log('Error sending data to desktop application:',1, err);
                    });
                } catch (e) {
                    log(`custom-component #${idx} record (invalid JSON):`,1, recordData);
                }
                return; // Only send the first non-empty one
            }
        }
        log('No non-empty custom-component record found.',1);
    });

    // Insert the button after the h2
    h2Elem.parentNode.insertBefore(sendBtn, h2Elem.nextSibling);
}

// Try to add the button periodically in case the DOM loads late
setInterval(() => {
    if (developerSettingsEnabled) {
        addSendToDesktopButton();
    }
}, 1000);