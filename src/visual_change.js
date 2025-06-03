// Utility to get element by XPath
function getElementByXPath(xpath) {
    return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

let visualChangesEnabled = true;
let commentTextWrapEnabled = true;

// Listen for changes from popup/settings
chrome.storage.sync.get(['visualChangesEnabled', 'commentTextWrapEnabled'], (data) => {
    visualChangesEnabled = data.visualChangesEnabled !== false; // default to true
    commentTextWrapEnabled = data.commentTextWrapEnabled !== false; // default to true
});
chrome.storage.onChanged.addListener((changes) => {
    if (changes.visualChangesEnabled) {
        visualChangesEnabled = changes.visualChangesEnabled.newValue;
    }
    if (changes.commentTextWrapEnabled) {
        commentTextWrapEnabled = changes.commentTextWrapEnabled.newValue;
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
    // XPath to get the total number of comments
    // const totalCommentsXPath = '/html/body/app-root/div/div/div/div/ui-view/app-search/app-record/div/div/form/fieldset/div/div[3]/div/record-tabs/ngx-tabs/section/div[2]/ngx-tab[1]/div/div/div[1]/div[1]/record-section/div/div[8]/div/record-section/ngx-section/section/div/div/div/div/record-section/div/div/div[1]/div/comments-field/div/div[1]/div[1]/span/b';
    const totalCommentsXPath = '/html/body/app-root/div/div/div/div/app-search/app-record/div/div/form/fieldset/div/div[3]/div/record-tabs/ngx-tabs/section/div[2]/ngx-tab[1]/div/div/div[1]/div[1]/record-section/div/div[8]/div/record-section/ngx-section/section/div/div/div/div/record-section/div/div/div[1]/div/comments-field/div/div[1]/div[1]/span/b';

    const totalCommentsElem = getElementByXPath(totalCommentsXPath);
    if (!totalCommentsElem) return;

    const totalComments = parseInt(totalCommentsElem.textContent, 10);
    if (isNaN(totalComments) || totalComments < 1) return;

    // Loop through each comment and apply text-wrap: auto to the span
    for (let i = 1; i <= totalComments; i++) {
        // const commentSpanXPath = `/html/body/app-root/div/div/div/div/ui-view/app-search/app-record/div/div/form/fieldset/div/div[3]/div/record-tabs/ngx-tabs/section/div[2]/ngx-tab[1]/div/div/div[1]/div[1]/record-section/div/div[8]/div/record-section/ngx-section/section/div/div/div/div/record-section/div/div/div[1]/div/comments-field/div/div[1]/comments-list/div/div[${i}]/comment/div/blockquote/div/div[2]/div/span`;
        const commentSpanXPath = `/html/body/app-root/div/div/div/div/app-search/app-record/div/div/form/fieldset/div/div[3]/div/record-tabs/ngx-tabs/section/div[2]/ngx-tab[1]/div/div/div[1]/div[1]/record-section/div/div[8]/div/record-section/ngx-section/section/div/div/div/div/record-section/div/div/div[1]/div/comments-field/div/div[1]/comments-list/div/div/comment/div/blockquote/div/div[2]/div/span`;

        const spanElem = getElementByXPath(commentSpanXPath);
        if (spanElem) {
            spanElem.style.textWrap = 'auto';
        }
    }
}

// Run periodically to handle dynamic DOM changes
setInterval(() => {
    periodicallyReplaceDropdown();
    if (commentTextWrapEnabled) {
        applyTextWrapToComments();
    }
}, 1000);