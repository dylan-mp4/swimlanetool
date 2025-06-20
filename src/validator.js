var debugMode = false;
var discrepancyCheckingEnabled = true;

function log(message, ...args) {
    if (debugMode) {
        console.log(`SLTool: ${message}`, ...args);
    }
}

if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['discrepancyCheckingEnabled', 'debugMode'], (data) => {
        if (data.discrepancyCheckingEnabled !== undefined) {
            discrepancyCheckingEnabled = !!data.discrepancyCheckingEnabled;
            log('Loaded validation enabled state:', discrepancyCheckingEnabled);
        }
        if (data.debugMode !== undefined) {
            debugMode = !!data.debugMode;
            log('Loaded debug mode state:', debugMode);
        }
    });
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.discrepancyCheckingEnabled) {
            discrepancyCheckingEnabled = !!changes.discrepancyCheckingEnabled.newValue;
            log('Validation enabled changed:', discrepancyCheckingEnabled);
        }
        if (changes.debugMode) {
            debugMode = !!changes.debugMode.newValue;
            log('Debug mode changed:', debugMode);
        }
    });
}

function getCustomComponentElements() {
    // Select all elements whose tag name starts with 'custom-component-'
    const all = Array.from(document.querySelectorAll('*'));
    const filtered = all.filter(
        el => el.tagName.toLowerCase().startsWith('custom-component-')
    );
    // console.log('Total elements in DOM:', all.length);
    log('Identified custom-component-* elements:', filtered.length, filtered);
    return filtered;
}

function getTextFromElement(el) {
    if (!el) return null;
    log(`innerHTML for <${el.tagName.toLowerCase()}>:`, el.innerHTML);
    if (el.shadowRoot) {
        // console.log(`shadowRoot.innerHTML for <${el.tagName.toLowerCase()}>:`, el.shadowRoot.innerHTML);
    }
    let text = el.textContent.trim();
    if (el.shadowRoot) {
        const shadowText = el.shadowRoot.textContent.trim();
        if (shadowText) text += ' ' + shadowText;
    }
    // console.log(`Text for <${el.tagName.toLowerCase()}>:`, text);
    return text;
}

function getInputValueFromXPath(xpath) {
    const elem = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (elem) {
        // For input fields, use .value instead of .textContent
        return elem.value ? elem.value.trim() : null;
    }
    return null;
}

function showSoftAlert(message) {
    let alertDiv = document.getElementById('soft-alert-validator');
    if (!alertDiv) {
        alertDiv = document.createElement('div');
        alertDiv.id = 'soft-alert-validator';
        alertDiv.style.position = 'fixed';
        alertDiv.style.top = '0';
        alertDiv.style.left = '0';
        alertDiv.style.width = '100%';
        alertDiv.style.background = '#ffcc00';
        alertDiv.style.color = '#000';
        alertDiv.style.fontWeight = 'bold';
        alertDiv.style.textAlign = 'center';
        alertDiv.style.padding = '12px 0';
        alertDiv.style.zIndex = '9999';
        document.body.appendChild(alertDiv);
    }
    alertDiv.textContent = message;
}

function hideSoftAlert() {
    const alertDiv = document.getElementById('soft-alert-validator');
    if (alertDiv) {
        alertDiv.remove();
    }
}

function extractAutomatedBriefTitle(text) {
    // Extracts title between "An Alert of type" and "was", allowing for any whitespace or line breaks
    const match = text.match(/An Alert of type\s*(.*?)\s*was received/si);
    return match ? match[1].trim() : null;
}

function extractCIMTitle(text) {
    // Extracts title between "Alert Title" and "Alert Unique ID", allowing for any whitespace or line breaks
    const match = text.match(/Alert Title\s*(.*?)\s*Alert Unique ID/si);
    return match ? match[1].trim() : null;
}

function validateContents() {
    if (!discrepancyCheckingEnabled) {
        return;
    }
    const elements = getCustomComponentElements();
    const diffs = [];

    // Your provided XPath
    const inputXPath = '/html/body/app-root/div/div/div/div/app-search/app-record/div/div/form/fieldset/div/div[3]/div/record-tabs/ngx-tabs/section/div[2]/ngx-tab[1]/div/div/div[1]/div[1]/record-section/div/div[1]/div/div/text-field/div/ngx-input/div/div[1]/div/div/input';
    const inputValue = getInputValueFromXPath(inputXPath);
    log('Input value from XPath:', inputValue);

    elements.forEach((el, idx) => {
        const text = getTextFromElement(el);
        const trimmedText = text.trim();
        let extractedTitle = null;
        let mode = null;

        if (trimmedText.startsWith("Automated Brief")) {
            mode = "Automated Brief";
            extractedTitle = extractAutomatedBriefTitle(trimmedText);
        } else if (trimmedText.startsWith("CIM")) {
            mode = "CIM";
            extractedTitle = extractCIMTitle(trimmedText);
        }

        if (extractedTitle) {
            log(`Element #${idx} <${el.tagName.toLowerCase()}> [${mode}]: FOUND TITLE = "${extractedTitle}"`);
            // Compare extracted title to input value
            if (inputValue && extractedTitle !== inputValue) {
                diffs.push({
                    index: idx,
                    tag: el.tagName.toLowerCase(),
                    mode,
                    extractedTitle,
                    inputValue,
                    text
                });
            }
        } else {
            log(`Element #${idx} <${el.tagName.toLowerCase()}> [${mode || "Other"}]: extractedTitle="null"`);
        }
    });

    if (diffs.length > 0) {
        showSoftAlert('A Discrepancy has been detected! Please refresh before proceeding.');
        log('Title mismatches with input value:', diffs);
        diffs.forEach(diff => {
            log(
                `Element #${diff.index} <${diff.tag}> [${diff.mode}]: extractedTitle="${diff.extractedTitle}" vs inputValue="${diff.inputValue}"`,
                diff.text
            );
        });
    } else {
        hideSoftAlert();
        log('All extracted titles match the input value.');
    }
}

setInterval(() => {
    if (discrepancyCheckingEnabled) {
        validateContents();
    }
}, 2000);