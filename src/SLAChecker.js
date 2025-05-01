const timestampXPath = "/html/body/app-root/div/div/div/div/ui-view/app-search/div/div[2]/div[2]/app-search-list/div[2]/ngx-datatable/div/datatable-body/datatable-selection/datatable-scroller/datatable-row-wrapper[ROW_INDEX]/datatable-body-row/div[2]/datatable-body-cell[8]/div/span";
const rowXPath = "/html/body/app-root/div/div/div/div/ui-view/app-search/div/div[2]/div[2]/app-search-list/div[2]/ngx-datatable/div/datatable-body/datatable-selection/datatable-scroller/datatable-row-wrapper[ROW_INDEX]/datatable-body-row";
const firstColumnXPath = "/html/body/app-root/div/div/div/div/ui-view/app-search/div/div[2]/div[2]/app-search-list/div[2]/ngx-datatable/div/datatable-body/datatable-selection/datatable-scroller/datatable-row-wrapper[ROW_INDEX]/datatable-body-row/div[2]/datatable-body-cell[1]";
const caseStageXPath = "/html/body/app-root/div/div/div/div/ui-view/app-search/div/div[2]/div[2]/app-search-list/div[2]/ngx-datatable/div/datatable-body/datatable-selection/datatable-scroller/datatable-row-wrapper[ROW_INDEX]/datatable-body-row/div[2]/datatable-body-cell[5]/div/span";
const slaAssessmentEndXPath = "/html/body/app-root/div/div/div/div/ui-view/app-search/div/div[2]/div[2]/app-search-list/div[2]/ngx-datatable/div/datatable-body/datatable-selection/datatable-scroller/datatable-row-wrapper[ROW_INDEX]/datatable-body-row/div[2]/datatable-body-cell[9]/div/span";
let slaCheckerIntervalId = null; // Interval ID for periodic updates
let headerIndexMap = {}; // Map to store header names and their column indices

// Function to calculate the gradient color for "Assessment" stage
function calculateGradientColorAssessment(timeDifferenceInMinutes) {
    const green = { r: 0, g: 255, b: 0 }; // Green at 0 minutes
    const orange = { r: 240, g: 165, b: 0 }; // Orange at 30 minutes
    const red = { r: 230, g: 0, b: 0 }; // Red at 50 minutes

    if (timeDifferenceInMinutes <= 30) {
        const ratio = timeDifferenceInMinutes / 30;
        const r = Math.floor(green.r + (orange.r - green.r) * ratio);
        const g = Math.floor(green.g + (orange.g - green.g) * ratio);
        const b = Math.floor(green.b + (orange.b - green.b) * ratio);
        return `rgb(${r}, ${g}, ${b}, 0.33)`;
    } else if (timeDifferenceInMinutes <= 50) {
        const ratio = (timeDifferenceInMinutes - 30) / 20;
        const r = Math.floor(orange.r + (red.r - orange.r) * ratio);
        const g = Math.floor(orange.g + (red.g - orange.g) * ratio);
        const b = Math.floor(orange.b + (red.b - orange.b) * ratio);
        return `rgb(${r}, ${g}, ${b}, 0.33)`;
    } else {
        return `rgb(${red.r}, ${red.g}, ${red.b}, 0.33)`;
    }
}

// Function to calculate the gradient color for "Awaiting Analyst" stage
function calculateGradientColorAwaitingAnalyst(timeDifferenceInMinutes) {
    if (timeDifferenceInMinutes >= 15) {
        return `rgb(230, 0, 0, 0.33)`; // Red
    }
    return `rgb(0, 255, 0, 0.33)`; // Green
}
// Function to dynamically index headers
function indexHeaders() {
    console.log("Indexing headers...");
    headerIndexMap = {}; // Reset the map

    const headerXPath = "/html/body/app-root/div/div/div/div/ui-view/app-search/div/div[2]/div[2]/app-search-list/div[2]/ngx-datatable/div/datatable-header/div/div[2]/datatable-header-cell";
    const headerNodesSnapshot = document.evaluate(headerXPath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

    for (let i = 0; i < headerNodesSnapshot.snapshotLength; i++) {
        const headerElement = headerNodesSnapshot.snapshotItem(i);
        const headerText = headerElement.querySelector("span > span")?.textContent?.trim();

        if (headerText) {
            headerIndexMap[headerText] = i + 1; // Store the column index (1-based)
            console.log(`Indexed header: "${headerText}" at column ${i + 1}`);
        }
    }

    console.log("Header indexing complete:", headerIndexMap);
}

// Function to get the XPath for a specific header's column
function getColumnXPath(headerName, rowIndex) {
    const columnIndex = headerIndexMap[headerName];
    if (!columnIndex) {
        console.error(`Header "${headerName}" not found in the indexed headers.`);
        return null;
    }

    return `/html/body/app-root/div/div/div/div/ui-view/app-search/div/div[2]/div[2]/app-search-list/div[2]/ngx-datatable/div/datatable-body/datatable-selection/datatable-scroller/datatable-row-wrapper[${rowIndex}]/datatable-body-row/div[2]/datatable-body-cell[${columnIndex}]/div/span`;
}

// Initialize the SLA Checker state on page load
window.addEventListener("load", () => {
    chrome.storage.sync.get(["slaCheckerEnabled"], (data) => {
        const slaCheckerEnabled = data.slaCheckerEnabled || false; // Default to false if not set
        console.log(`SLA Checker enabled state on load: ${slaCheckerEnabled}`);
        if (slaCheckerEnabled) {
            startSlaChecker();
        } else {
            stopSlaChecker();
        }
    });
});

// Listen for messages to enable or disable the SLA Checker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(`Received message: ${JSON.stringify(request)}`);
    if (request.action === "updateSlaChecker") {
        const slaCheckerEnabled = request.enabled;
        console.log(`Updating SLA Checker state to: ${slaCheckerEnabled}`);
        if (slaCheckerEnabled) {
            startSlaChecker();
        } else {
            stopSlaChecker();
        }
        sendResponse({ status: "success" });
    }
});

// Function to start the SLA Checker
function startSlaChecker() {
    console.log("Starting SLA Checker...");
    indexHeaders(); // Index headers before processing rows
    updateAllRows();

    if (slaCheckerIntervalId) {
        clearInterval(slaCheckerIntervalId);
    }

    slaCheckerIntervalId = setInterval(() => {
        indexHeaders(); // Re-index headers on each refresh
        updateAllRows();
    }, 1000);

    console.log("SLTool: SLA Checker enabled.");
}

// Function to stop the SLA Checker
function stopSlaChecker() {
    console.log("Stopping SLA Checker...");
    if (slaCheckerIntervalId) {
        clearInterval(slaCheckerIntervalId);
        slaCheckerIntervalId = null;
    }

    disableSlaChecker();
    console.log("SLTool: SLA Checker disabled.");
}

// Function to disable the SLA Checker and restore the row-color class
function disableSlaChecker() {
    console.log("Disabling SLA Checker and restoring row colors...");
    let rowIndex = 1;
    while (true) {
        const firstColumnXPathForRow = getColumnXPath("Current Owner", rowIndex); // Replace with actual header name
        if (!firstColumnXPathForRow) break;

        const firstColumnResult = document.evaluate(firstColumnXPathForRow, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const firstColumnElement = firstColumnResult.singleNodeValue;

        if (!firstColumnElement) {
            console.log(`No more rows found at index ${rowIndex}.`);
            break;
        }

        firstColumnElement.style.removeProperty("background-color");
        firstColumnElement.classList.add("row-color");

        rowIndex++;
    }
}

// Function to update colors for a single row
function updateRowColors(rowIndex) {
    console.log(`Updating colors for row index: ${rowIndex}`);
    const caseStageXPathForRow = getColumnXPath("Case Stage", rowIndex); // Replace with actual header name
    if (!caseStageXPathForRow) return false;

    const caseStageResult = document.evaluate(caseStageXPathForRow, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const caseStageElement = caseStageResult.singleNodeValue;

    if (!caseStageElement) {
        console.log(`No case stage element found for row index ${rowIndex}.`);
        return false;
    }

    const caseStage = caseStageElement.textContent.trim();
    console.log(`Case stage for row ${rowIndex}: ${caseStage}`);
    let timeDifferenceInMinutes = 0;
    let gradientColor = "";

    if (caseStage === "Assessment") {
        console.log(`Processing "Assessment" case for row ${rowIndex}`);
        const slaAssessmentEndXPathForRow = getColumnXPath("SLA Assessment end timer", rowIndex); // Replace with actual header name
        console.log(`Generated XPath for SLA Assessment End: ${slaAssessmentEndXPathForRow}`);

        if (!slaAssessmentEndXPathForRow) {
            console.warn(`XPath for SLA Assessment End not found for row ${rowIndex}`);
            return true;
        }

        const slaAssessmentEndResult = document.evaluate(slaAssessmentEndXPathForRow, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const slaAssessmentEndElement = slaAssessmentEndResult.singleNodeValue;

        if (!slaAssessmentEndElement) {
            console.warn(`No SLA Assessment End element found for row ${rowIndex}.`);
            return true;
        }

        const slaAssessmentEndText = slaAssessmentEndElement.textContent.trim();
        console.log(`SLA Assessment End time for row ${rowIndex}: ${slaAssessmentEndText}`);

        const [time, period] = slaAssessmentEndText.split(" ");
        if (!time || !period) {
            console.error(`Invalid SLA Assessment End time format for row ${rowIndex}: "${slaAssessmentEndText}"`);
            return true;
        }

        const [hours, minutes] = time.split(":").map(Number);
        if (isNaN(hours) || isNaN(minutes)) {
            console.error(`Invalid time components for row ${rowIndex}: "${time}"`);
            return true;
        }

        const slaAssessmentEndDate = new Date();
        slaAssessmentEndDate.setHours(period === "PM" ? hours + 12 : hours, minutes, 0, 0);

        const currentTime = new Date();
        timeDifferenceInMinutes = Math.floor((currentTime - slaAssessmentEndDate) / (1000 * 60));
        console.log(`Time difference in minutes for SLA Assessment End for row ${rowIndex}: ${timeDifferenceInMinutes}`);

        gradientColor = calculateGradientColorAssessment(timeDifferenceInMinutes);
        console.log(`Calculated gradient color for row ${rowIndex}: ${gradientColor}`);
        applyGradientColor(rowIndex, gradientColor, caseStage);
    } else if (caseStage === "Awaiting Analyst") {
        console.log(`Processing "Awaiting Analyst" case for row ${rowIndex}`);
        const awaitingAnalystTimestampXPathForRow = getColumnXPath("Awaiting Analyst Timestamp", rowIndex); // Replace with actual header name
        console.log(`Generated XPath for Awaiting Analyst Timestamp: ${awaitingAnalystTimestampXPathForRow}`);

        if (!awaitingAnalystTimestampXPathForRow) {
            console.warn(`XPath for Awaiting Analyst Timestamp not found for row ${rowIndex}`);
            return true;
        }

        const awaitingAnalystTimestampResult = document.evaluate(awaitingAnalystTimestampXPathForRow, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const awaitingAnalystTimestampElement = awaitingAnalystTimestampResult.singleNodeValue;

        if (!awaitingAnalystTimestampElement) {
            console.warn(`No Awaiting Analyst Timestamp element found for row ${rowIndex}.`);
            return true;
        }

        const awaitingAnalystTimestampText = awaitingAnalystTimestampElement.textContent.trim();
        console.log(`Awaiting Analyst Timestamp for row ${rowIndex}: ${awaitingAnalystTimestampText}`);

        const awaitingAnalystTimestampDate = new Date(awaitingAnalystTimestampText);
        if (isNaN(awaitingAnalystTimestampDate.getTime())) {
            console.error(`Invalid Awaiting Analyst Timestamp for row ${rowIndex}: "${awaitingAnalystTimestampText}"`);
            return true;
        }

        const currentTime = new Date();
        timeDifferenceInMinutes = Math.floor((currentTime - awaitingAnalystTimestampDate) / (1000 * 60));
        console.log(`Time difference in minutes for Awaiting Analyst Timestamp for row ${rowIndex}: ${timeDifferenceInMinutes}`);

        gradientColor = calculateGradientColorAwaitingAnalyst(timeDifferenceInMinutes);
        console.log(`Calculated gradient color for row ${rowIndex}: ${gradientColor}`);
        applyGradientColor(rowIndex, gradientColor, caseStage);
    } else if (caseStage === "Analyst Follow Up") {
        applySolidColor(rowIndex, "rgb(10, 205, 240, 0.33)")
    } else if (caseStage === "Response Received") {
        applySolidColor(rowIndex, "rgb(147, 52, 255, 0.33)")
    } else {
        console.log(`Skipping row ${rowIndex} with case stage "${caseStage}"`);
        return true; // Skip rows that are not "Assessment" or "Awaiting Analyst"
    }

    return true;
}

function applySolidColor(rowIndex, color) {
    let firstColumnXPathForRow = getColumnXPath("Current Owner", rowIndex); // Replace with actual header name
    console.log(`Generated XPath for Current Owner: ${firstColumnXPathForRow}`);

    if (!firstColumnXPathForRow) {
        console.warn(`XPath for Current Owner not found for row ${rowIndex}`);
        return;
    }

    // Attempt to resolve the first DOM structure
    let firstColumnResult = document.evaluate(firstColumnXPathForRow, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    let firstColumnElement = firstColumnResult.singleNodeValue;

    // Flag to track if the XPath was adjusted
    let isXPathAdjusted = false;

    // If the first attempt fails, try the alternative DOM structure
    if (!firstColumnElement) {
        console.warn(`No Current Owner element found for row ${rowIndex} using initial XPath.`);
        firstColumnXPathForRow = firstColumnXPathForRow.replace("/div/span", "/div"); // Adjust XPath for alternative structure
        console.log(`Trying alternative XPath for Current Owner: ${firstColumnXPathForRow}`);
        firstColumnResult = document.evaluate(firstColumnXPathForRow, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        firstColumnElement = firstColumnResult.singleNodeValue;
        isXPathAdjusted = true; // Mark that the XPath was adjusted
    }

    // If the element is still not found, log a warning and exit
    if (!firstColumnElement) {
        console.warn(`No Current Owner element found for row ${rowIndex} after trying both DOM structures.`);
        return;
    }

    // Determine which DOM structure to use based on whether the XPath was adjusted
    if (isXPathAdjusted) {
        // Apply solid color to the parent element if the XPath was adjusted
        const parentElement = firstColumnElement.parentElement;
        if (parentElement) {
            console.log(`Applying solid color to parent element for row ${rowIndex}: ${color}`);
            parentElement.style.setProperty("background-color", color, "important");
            parentElement.style.backgroundImage = "none"; // Remove any background image
        } else {
            console.warn(`Parent element not found for row ${rowIndex}`);
        }
    } else {
        // Apply solid color to the parent of the parent element if the XPath was not adjusted
        const parentParentElement = firstColumnElement.parentElement?.parentElement;
        if (parentParentElement) {
            console.log(`Applying solid color to parent of parent for row ${rowIndex}: ${color}`);
            parentParentElement.style.setProperty("background-color", color, "important");
            parentParentElement.style.backgroundImage = "none"; // Remove any background image
        } else {
            console.warn(`Parent's parent element not found for row ${rowIndex}`);
        }
    }
}

function applyGradientColor(rowIndex, gradientColor, caseStage) {
    let firstColumnXPathForRow = getColumnXPath("Current Owner", rowIndex); // Replace with actual header name
    console.log(`Generated XPath for Current Owner: ${firstColumnXPathForRow}`);

    // Adjust XPath for Awaiting Analyst case stage
    if (caseStage === "Awaiting Analyst") {
        firstColumnXPathForRow = firstColumnXPathForRow.replace("/div/span", "/div");
        console.log(`Adjusted XPath for Awaiting Analyst: ${firstColumnXPathForRow}`);
    }

    if (!firstColumnXPathForRow) {
        console.warn(`XPath for Current Owner not found for row ${rowIndex}`);
        return;
    }

    const firstColumnResult = document.evaluate(firstColumnXPathForRow, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const firstColumnElement = firstColumnResult.singleNodeValue;

    if (!firstColumnElement) {
        console.warn(`No Current Owner element found for row ${rowIndex}.`);
        console.log(`Generated XPath: ${firstColumnXPathForRow}`);
        return;
    }

    if (caseStage === "Awaiting Analyst") {
        // Apply gradient color to the parent element for Awaiting Analyst
        const parentElement = firstColumnElement.parentElement;
        if (parentElement) {
            console.log(`Applying gradient color to parent element for row ${rowIndex}: ${gradientColor}`);
            parentElement.style.setProperty("background-color", gradientColor, "important");
            parentElement.style.backgroundImage = "none"; // Remove any background image
        } else {
            console.warn(`Parent element not found for row ${rowIndex}`);
        }
    } else {
        // Apply gradient color to the parent of the parent element for other case stages
        const parentParentElement = firstColumnElement.parentElement?.parentElement;
        if (parentParentElement) {
            console.log(`Applying gradient color to parent of parent for row ${rowIndex}: ${gradientColor}`);
            parentParentElement.style.setProperty("background-color", gradientColor, "important");
            parentParentElement.style.backgroundImage = "none"; // Remove any background image
        } else {
            console.warn(`Parent's parent element not found for row ${rowIndex}`);
        }
    }
}

// Function to update colors for all rows
function updateAllRows() {
    console.log("Updating all rows...");
    let rowIndex = 1;
    while (updateRowColors(rowIndex)) {
        rowIndex++;
    }
}