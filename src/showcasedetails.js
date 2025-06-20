var debugMode = false;
var autoShowCaseDetails = true;

function log(message, ...args) {
    if (debugMode) {
        console.log(`SLTool: ${message}`, ...args);
    }
}

if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['autoShowCaseDetails', 'debugMode'], (data) => {
        if (data.autoShowCaseDetails !== undefined) {
            autoShowCaseDetails = !!data.autoShowCaseDetails;
            log('autoShowCaseDetails enabled state:', autoShowCaseDetails);
        }
        if (data.debugMode !== undefined) {
            debugMode = !!data.debugMode;
            log('Loaded debug mode state:', debugMode);
        }
    });
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.autoShowCaseDetails) {
            autoShowCaseDetails = !!changes.autoShowCaseDetails.newValue;
            log('autoShowCaseDetails enabled changed:', autoShowCaseDetails);
        }
        if (changes.debugMode) {
            debugMode = !!changes.debugMode.newValue;
            log('Debug mode changed:', debugMode);
        }
    });
}

function clickToggleButtonBySectionTitle(sectionTitle) {
    const headers = document.querySelectorAll('header.ngx-section-header');
    for (const header of headers) {
        const h1 = header.querySelector('h1');
        if (h1 && h1.textContent.trim() === sectionTitle) {
            const btn = header.querySelector('button.ngx-section-toggle[title="Toggle Content Visibility"]');
            if (btn) {
                btn.click();
                log(`Clicked Toggle Content Visibility button for section "${sectionTitle}"`);
                return true;
            }
        }
    }
    log(`Section with title "${sectionTitle}" not found`);
    return false;
}

const TARGET_XPATH = '/html/body/app-root/div/div/div/div/app-search/app-record/div/ngx-toolbar/header/div[1]/ngx-toolbar-title/h2/span';
let observer = null;
let hasRunForCurrentElement = false;

function runSectionCheckboxLogic() {
    clickToggleButtonBySectionTitle('Admin Controls');
    setTimeout(() => {
        const header = Array.from(document.querySelectorAll('header.ngx-section-header')).find(h =>
            h.querySelector('h1') && h.querySelector('h1').textContent.trim() === 'Admin Controls'
        );
        if (header) {
            let section = header.nextElementSibling;
            if (section) {
                const labels = section.querySelectorAll('label.ngx-checkbox--label');
                let found = false;
                labels.forEach(label => {
                    const content = label.querySelector('.ngx-checkbox--content');
                    if (content && content.textContent.trim() === 'Display All Application Fields') {
                        const checkbox = label.querySelector('input[type="checkbox"]');
                        if (checkbox && !checkbox.checked) {
                            checkbox.click();
                            log('Checkbox was unchecked, now checked in Admin Controls section!');
                        } else if (checkbox && checkbox.checked) {
                            log('Checkbox already checked in Admin Controls section, no action taken.');
                        } else {
                            log('Checkbox not found in label.');
                        }
                        found = true;
                    }
                });
                if (!found) {
                    log('Checkbox with label "Display All Application Fields" not found in Admin Controls section');
                }
            } else {
                log('Section container not found after header');
            }
        }
    }, 500);
}

function checkAndRun() {
    const elem = document.evaluate(TARGET_XPATH, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (elem && !hasRunForCurrentElement) {
        hasRunForCurrentElement = true;
        runSectionCheckboxLogic();
    } else if (!elem && hasRunForCurrentElement) {
        // Element disappeared, reset for next appearance
        hasRunForCurrentElement = false;
    }
}

// Observe DOM changes and trigger logic
if (observer) observer.disconnect();
observer = new MutationObserver(checkAndRun);
observer.observe(document.body, { childList: true, subtree: true });

// Initial check in case the element is already present
checkAndRun();