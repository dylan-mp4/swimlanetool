// Utility to get element by XPath
function getElementByXPath(xpath) {
    return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

let visualChangesEnabled = true;
let commentTextWrapEnabled = true;
let searchOverlayEnabled = true;
let disableTooltips = false;
let hideEmptyAwarenessEnabled = false;

// Listen for changes from popup/settings
chrome.storage.sync.get(['visualChangesEnabled', 'commentTextWrapEnabled', 'disableTooltips','hideEmptyAwareness'], (data) => {
    visualChangesEnabled = data.visualChangesEnabled !== false; // default to true
    commentTextWrapEnabled = data.commentTextWrapEnabled !== false; // default to true
    searchOverlayEnabled = data.searchOverlayEnabled !== false; // default to true
    hideEmptyAwarenessEnabled = data.hideEmptyAwareness || false; // default to true
    disableTooltips = data.disableTooltips || false; // default to false
});
chrome.storage.onChanged.addListener((changes) => {
    if (changes.visualChangesEnabled) {
        visualChangesEnabled = changes.visualChangesEnabled.newValue;
    }
    if (changes.commentTextWrapEnabled) {
        commentTextWrapEnabled = changes.commentTextWrapEnabled.newValue;
    }
    if (changes.searchOverlayEnabled) {
        searchOverlayEnabled = changes.searchOverlayEnabled.newValue;
    }
    if (changes.hideEmptyAwareness) {
        hideEmptyAwarenessEnabled = changes.hideEmptyAwareness.newValue;
    }
    if (changes.disableTooltips) {
        disableTooltips = changes.disableTooltips.newValue;
        if (disableTooltips) {
            injectNgxTooltipHideCSS();
        } else {
            removeNgxTooltipHideCSS();
        }
    }
});

// Periodically replace the dropdown with two buttons
function periodicallyReplaceDropdown() {
    if (!visualChangesEnabled) return;
    const dropdown = document.querySelector('.ngx-dropdown.record-state__toolbar__controls__save-dropdown');
    if (!dropdown) {
        // Dropdown not found, try again later
        return;
    }

    // Insert before dropdown
    const parent = dropdown.parentElement;

    // Adjust parent margin
    parent.style.marginRight = '7%';
    parent.style.display = 'flex';
    parent.style.flexWrap = 'nowrap';
    parent.style.width = '10%';

    // Hide the specified ngx-button
    // const buttonToHide = getElementByXPath('/html/body/app-root/div/div/div/div/ui-view/app-search/app-record/div/ngx-toolbar/header/div[2]/ngx-toolbar-content/div/span/ngx-button');
    const buttonToHide = getElementByXPath('/html/body/app-root/div/div/div/div/app-search/app-record/div/ngx-toolbar/header/div[2]/ngx-toolbar-content/div/span/ngx-button');
    if (buttonToHide) {
        buttonToHide.style.display = 'none';
    }

    // Prevent duplicate insertion
    if (
        dropdown.previousSibling &&
        dropdown.previousSibling.classList &&
        dropdown.previousSibling.classList.contains('sltool-save-btn')
    ) {
        return;
    }

    // XPaths for original buttons
    // const saveBtnXPath = '/html/body/app-root/div/div/div/div/ui-view/app-search/app-record/div/ngx-toolbar/header/div[2]/ngx-toolbar-content/div/span/ngx-dropdown/ngx-dropdown-menu/ul/li[1]/button';
    const saveBtnXPath = '/html/body/app-root/div/div/div/div/app-search/app-record/div/ngx-toolbar/header/div[2]/ngx-toolbar-content/div/span/ngx-dropdown/ngx-dropdown-menu/ul/li[1]/button';
    // const saveAndCloseBtnXPath = '/html/body/app-root/div/div/div/div/ui-view/app-search/app-record/div/ngx-toolbar/header/div[2]/ngx-toolbar-content/div/span/ngx-dropdown/ngx-dropdown-menu/ul/li[2]/button';
    const saveAndCloseBtnXPath = '/html/body/app-root/div/div/div/div/app-search/app-record/div/ngx-toolbar/header/div[2]/ngx-toolbar-content/div/span/ngx-dropdown/ngx-dropdown-menu/ul/li[2]/button';
    // Create Save button
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.className = 'btn btn-primary sltool-save-btn';
    saveButton.style.marginRight = '8px';
    saveButton.style.height = '36px';
    saveButton.style.fontSize = '15px';
    saveButton.style.verticalAlign = 'middle';
    saveButton.onclick = function () {
        dropdown.style.display = '';
        const originalSave = getElementByXPath(saveBtnXPath);
        if (originalSave) {
            originalSave.click();
        }
        dropdown.style.display = 'none';
    };

    // Create Save & Close button
    const saveAndCloseButton = document.createElement('button');
    saveAndCloseButton.textContent = 'Save & Close';
    saveAndCloseButton.className = 'btn btn-secondary sltool-save-btn';
    saveAndCloseButton.style.marginRight = '8px';
    saveAndCloseButton.style.height = '36px';
    saveAndCloseButton.style.fontSize = '15px';
    saveAndCloseButton.style.verticalAlign = 'middle';
    saveAndCloseButton.onclick = function () {
        dropdown.style.display = '';
        const originalSaveAndClose = getElementByXPath(saveAndCloseBtnXPath);
        if (originalSaveAndClose) {
            originalSaveAndClose.click();
        }
        dropdown.style.display = 'none';
    };

    parent.insertBefore(saveButton, dropdown);
    parent.insertBefore(saveAndCloseButton, dropdown);

    // Hide dropdown instead of removing it
    dropdown.style.display = 'none';

    // --- Move ngx-dropdown to start of the ul element ---
    // const dropdownToMove = getElementByXPath('/html/body/app-root/div/div/div/div/ui-view/app-search/app-record/div/ngx-toolbar/header/div[2]/ngx-toolbar-content/div/ngx-dropdown');
    const dropdownToMove = getElementByXPath('/html/body/app-root/div/div/div/div/app-search/app-record/div/ngx-toolbar/header/div[2]/ngx-toolbar-content/div/ngx-dropdown/ngx-dropdown-toggle');

    const ul = dropdown.querySelector('ul.vertical-list');
    if (dropdownToMove && ul && dropdownToMove !== ul.firstChild) {
        ul.style.display = 'none';
        dropdownToMove.style.display = 'none';
    }
}



function applyTextWrapToComments() {
    // Select all elements with class 'comment--body--pre ng-star-inserted'
    const commentBodies = document.querySelectorAll('.comment--body--pre.ng-star-inserted');
    commentBodies.forEach(elem => {
        elem.style.textWrap = 'auto';
        // For maximum compatibility, also set word-break and white-space
        elem.style.wordBreak = 'break-word';
        elem.style.whiteSpace = 'pre-wrap';
    });
}

function setOverlayHeight() {
    const overlays = document.getElementsByClassName('cdk-overlay-pane');
    for (let i = 0; i < overlays.length; i++) {
        overlays[i].style.height = '100%';
    }
}

function injectNgxTooltipHideCSS() {
    if (document.getElementById('sltool-hide-ngx-tooltip-css')) return; // Prevent duplicates
    const style = document.createElement('style');
    style.id = 'sltool-hide-ngx-tooltip-css';
    style.textContent = `
        .ngx-tooltip-content {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
    `;
    document.head.appendChild(style);
}

function hideEmptyAwareness() {
    const xpathIndices = [1, 2, 3, 4];
    const baseXpath = '/html/body/app-root/div/div/div/div/app-search/app-record/div/div/form/fieldset/div/div';
    xpathIndices.forEach(idx => {
        const xpath = `${baseXpath}[${idx}]`;
        const el = getElementByXPath(xpath);
        if (el) {
            const output = el.querySelector('output');
            if (!output) {
                el.style.display = 'none';
                // console.log(`Hiding element at XPath: ${xpath} (no <output> found)`);
            } else {
                let onlyEmptyOrComments = true;
                let outputText = '';
                for (let node of output.childNodes) {
                    if (
                        node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== ''
                    ) {
                        onlyEmptyOrComments = false;
                        outputText += node.textContent.trim();
                    }
                    if (
                        node.nodeType === Node.ELEMENT_NODE
                    ) {
                        onlyEmptyOrComments = false;
                        outputText += node.textContent.trim();
                    }
                }
                if (onlyEmptyOrComments) {
                    el.style.display = 'none';
                    // console.log(`Hiding element at XPath: ${xpath} (<output> is empty or only comments)`);
                } else if (
                    outputText === 'No Exceptional Situations currently' ||
                    outputText === 'No Internal Exceptional Situations currently'
                ) {
                    el.style.display = 'none';
                    // console.log(`Hiding element at XPath: ${xpath} (outputText: "${outputText}")`);
                } else {
                    el.style.display = '';
                    // console.log(`Keeping element at XPath: ${xpath} (<output> has content)`);
                }
            }
        }
    });
}

function removeNgxTooltipHideCSS() {
    const style = document.getElementById('sltool-hide-ngx-tooltip-css');
    if (style) style.remove();
}

if (disableTooltips) {
    injectNgxTooltipHideCSS();
} else {
    removeNgxTooltipHideCSS();
}

// Run periodically to handle dynamic DOM changes
setInterval(() => {
    periodicallyReplaceDropdown();
    if (commentTextWrapEnabled) {
        applyTextWrapToComments();
    }
    if (searchOverlayEnabled) {
        setOverlayHeight();
    }
    if (hideEmptyAwarenessEnabled) {
        hideEmptyAwareness();
    }
}, 1000);

setInterval(() => {
    if (disableTooltips) {
        injectNgxTooltipHideCSS();
    } else {
        removeNgxTooltipHideCSS();
    }
}, 10000);