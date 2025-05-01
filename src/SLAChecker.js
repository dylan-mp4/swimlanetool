const timestampXPath = "/html/body/app-root/div/div/div/div/ui-view/app-search/div/div[2]/div[2]/app-search-list/div[2]/ngx-datatable/div/datatable-body/datatable-selection/datatable-scroller/datatable-row-wrapper[ROW_INDEX]/datatable-body-row/div[2]/datatable-body-cell[8]/div/span";
const rowXPath = "/html/body/app-root/div/div/div/div/ui-view/app-search/div/div[2]/div[2]/app-search-list/div[2]/ngx-datatable/div/datatable-body/datatable-selection/datatable-scroller/datatable-row-wrapper[ROW_INDEX]/datatable-body-row";
const firstColumnXPath = "/html/body/app-root/div/div/div/div/ui-view/app-search/div/div[2]/div[2]/app-search-list/div[2]/ngx-datatable/div/datatable-body/datatable-selection/datatable-scroller/datatable-row-wrapper[ROW_INDEX]/datatable-body-row/div[2]/datatable-body-cell[1]";

let slaCheckerIntervalId = null; // Interval ID for periodic updates

// Initialize the SLA Checker state on page load
window.addEventListener('load', () => {
    chrome.storage.sync.get(['slaCheckerEnabled'], (data) => {
        const slaCheckerEnabled = data.slaCheckerEnabled || false; // Default to false if not set
        if (slaCheckerEnabled) {
            startSlaChecker();
        } else {
            stopSlaChecker();
        }
    });
});

// Listen for messages to enable or disable the SLA Checker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateSlaChecker') {
        const slaCheckerEnabled = request.enabled;
        if (slaCheckerEnabled) {
            startSlaChecker();
        } else {
            stopSlaChecker();
        }
        sendResponse({ status: 'success' });
    }
});

// Function to start the SLA Checker
function startSlaChecker() {
    // Run the SLA Checker immediately
    updateColumnColors();

    // Clear any existing interval to avoid duplicates
    if (slaCheckerIntervalId) {
        clearInterval(slaCheckerIntervalId);
    }

    // Set an interval to update the SLA Checker every second
    slaCheckerIntervalId = setInterval(updateColumnColors, 1000);
    console.log('SLTool: SLA Checker enabled.');
}

// Function to stop the SLA Checker
function stopSlaChecker() {
    // Clear the interval if it exists
    if (slaCheckerIntervalId) {
        clearInterval(slaCheckerIntervalId);
        slaCheckerIntervalId = null;
    }

    // Restore the row-color class for all rows
    disableSlaChecker();
    console.log('SLTool: SLA Checker disabled.');
}

// Function to disable the SLA Checker and restore the row-color class
function disableSlaChecker() {
    let rowIndex = 1;
    while (true) {
        const firstColumnXPathForRow = firstColumnXPath.replace("ROW_INDEX", rowIndex);
        const firstColumnResult = document.evaluate(firstColumnXPathForRow, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const firstColumnElement = firstColumnResult.singleNodeValue;

        if (!firstColumnElement) {
            break;
        }

        // Restore the row-color class
        firstColumnElement.style.removeProperty("background-color");
        firstColumnElement.classList.add("row-color");

        rowIndex++;
    }
}

// Function to calculate the gradient color based on time difference
function calculateGradientColor(timeDifferenceInMinutes) {
    const green = { r: 0, g: 255, b: 0 }; // Green at 0 minutes
    const orange = { r: 240, g: 165, b: 0 }; // Orange at 30 minutes
    const red = { r: 230, g: 0, b: 0 }; // Red at 50 minutes

    if (timeDifferenceInMinutes <= 30) {
        // Interpolate between green and orange
        const ratio = timeDifferenceInMinutes / 30;
        const r = Math.floor(green.r + (orange.r - green.r) * ratio);
        const g = Math.floor(green.g + (orange.g - green.g) * ratio);
        const b = Math.floor(green.b + (orange.b - green.b) * ratio);
        return `rgb(${r}, ${g}, ${b}, 0.33)`;
    } else if (timeDifferenceInMinutes <= 50) {
        // Interpolate between orange and red
        const ratio = (timeDifferenceInMinutes - 30) / 20;
        const r = Math.floor(orange.r + (red.r - orange.r) * ratio);
        const g = Math.floor(orange.g + (red.g - orange.g) * ratio);
        const b = Math.floor(orange.b + (red.b - orange.b) * ratio);
        return `rgb(${r}, ${g}, ${b}, 0.33)`;
    } else {
        // Beyond 50 minutes, return red
        return `rgb(${red.r}, ${red.g}, ${red.b}, 0.33)`;
    }
}

// Function to update the background color of the first column in all rows
function updateColumnColors() {
    let rowIndex = 1; // Start with the first row
    while (true) {
        // Replace ROW_INDEX in the XPath with the current row index
        const timestampXPathForRow = timestampXPath.replace("ROW_INDEX", rowIndex);
        const firstColumnXPathForRow = firstColumnXPath.replace("ROW_INDEX", rowIndex);

        // Get the timestamp element
        const timestampResult = document.evaluate(timestampXPathForRow, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const timestampElement = timestampResult.singleNodeValue;

        // Get the first column element
        const firstColumnResult = document.evaluate(firstColumnXPathForRow, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const firstColumnElement = firstColumnResult.singleNodeValue;

        // If no timestamp or column is found, break the loop
        if (!firstColumnElement) {
            // console.warn(`SLTool: First column element not found for row index ${rowIndex}. (likely response received)`);
            break;
        }
        if (!timestampElement) {
            rowIndex++;
            continue; // Skip this row and move to the next
        }

        // Parse the timestamp and calculate the time difference
        const timestampText = timestampElement.textContent.trim();
        const timestampDate = new Date(timestampText);
        if (isNaN(timestampDate.getTime())) {
            console.error(`SLTool: Invalid timestamp for row index ${rowIndex}: "${timestampText}".`);
            rowIndex++;
            continue; // Skip this row and move to the next
        }

        const currentTime = new Date();
        const timeDifferenceInMinutes = Math.floor((currentTime - timestampDate) / (1000 * 60)); // Difference in minutes

        // Calculate the gradient color
        const gradientColor = calculateGradientColor(timeDifferenceInMinutes);

        // Apply the background color to the first column
        firstColumnElement.style.setProperty("background-color", gradientColor, "important");
        firstColumnElement.style.backgroundImage = "none"; // Remove any background image

        // Move to the next row
        rowIndex++;
    }
}