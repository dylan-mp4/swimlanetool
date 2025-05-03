const timestampXPath = "/html/body/app-root/div/div/div/div/ui-view/app-search/div/div[2]/div[2]/app-search-list/div[2]/ngx-datatable/div/datatable-body/datatable-selection/datatable-scroller/datatable-row-wrapper[ROW_INDEX]/datatable-body-row/div[2]/datatable-body-cell[8]/div/span";
const rowXPath = "/html/body/app-root/div/div/div/div/ui-view/app-search/div/div[2]/div[2]/app-search-list/div[2]/ngx-datatable/div/datatable-body/datatable-selection/datatable-scroller/datatable-row-wrapper[ROW_INDEX]/datatable-body-row";
const firstColumnXPath = "/html/body/app-root/div/div/div/div/ui-view/app-search/div/div[2]/div[2]/app-search-list/div[2]/ngx-datatable/div/datatable-body/datatable-selection/datatable-scroller/datatable-row-wrapper[ROW_INDEX]/datatable-body-row/div[2]/datatable-body-cell[1]";
const caseStageXPath = "/html/body/app-root/div/div/div/div/ui-view/app-search/div/div[2]/div[2]/app-search-list/div[2]/ngx-datatable/div/datatable-body/datatable-selection/datatable-scroller/datatable-row-wrapper[ROW_INDEX]/datatable-body-row/div[2]/datatable-body-cell[5]/div/span";
const slaAssessmentEndXPath = "/html/body/app-root/div/div/div/div/ui-view/app-search/div/div[2]/div[2]/app-search-list/div[2]/ngx-datatable/div/datatable-body/datatable-selection/datatable-scroller/datatable-row-wrapper[ROW_INDEX]/datatable-body-row/div[2]/datatable-body-cell[9]/div/span";
let slaCheckerIntervalId = null; // Interval ID for periodic updates
let headerIndexMap = {}; // Map to store header names and their column indices

// Function to dynamically index headers
function indexHeaders() {
    // console.log("SLTool: Indexing headers...");
    headerIndexMap = {}; // Reset the map

    const headerXPath = "/html/body/app-root/div/div/div/div/ui-view/app-search/div/div[2]/div[2]/app-search-list/div[2]/ngx-datatable/div/datatable-header/div/div[2]/datatable-header-cell";
    const headerNodesSnapshot = document.evaluate(headerXPath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

    for (let i = 0; i < headerNodesSnapshot.snapshotLength; i++) {
        const headerElement = headerNodesSnapshot.snapshotItem(i);
        const headerText = headerElement.querySelector("span > span")?.textContent?.trim();

        if (headerText) {
            headerIndexMap[headerText] = i + 1; // Store the column index (1-based)
            // console.log(`SLTool: Indexed header: "${headerText}" at column ${i + 1}`);
        }
    }

    // console.log("SLTool: Header indexing complete:", headerIndexMap);
}

// Function to get the XPath for a specific header's column
function getColumnXPath(headerName, rowIndex) {
    const columnIndex = headerIndexMap[headerName];
    if (!columnIndex) {
        console.log(`Header "${headerName}" not found in the indexed headers. - Possible reason: The table is not loaded yet.`);
        return null;
    }

    return `/html/body/app-root/div/div/div/div/ui-view/app-search/div/div[2]/div[2]/app-search-list/div[2]/ngx-datatable/div/datatable-body/datatable-selection/datatable-scroller/datatable-row-wrapper[${rowIndex}]/datatable-body-row/div[2]/datatable-body-cell[${columnIndex}]/div/span`;
}

// Initialize the SLA Checker state on page load
window.addEventListener("load", () => {
    chrome.storage.sync.get(["slaCheckerEnabled"], (data) => {
        const slaCheckerEnabled = data.slaCheckerEnabled || false; // Default to false if not set
        console.log(`SLTool: SLA Checker enabled state on load: ${slaCheckerEnabled}`);
        if (slaCheckerEnabled) {
            startSlaChecker();
        } else {
            stopSlaChecker();
        }
    });
});

// Listen for messages to enable or disable the SLA Checker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(`SLTool: Received message: ${JSON.stringify(request)}`);
    if (request.action === "updateSlaChecker") {
        const slaCheckerEnabled = request.enabled;
        console.log(`SLTool: Updating SLA Checker state to: ${slaCheckerEnabled}`);
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
    if (slaCheckerIntervalId) {
        clearInterval(slaCheckerIntervalId);
        slaCheckerIntervalId = null;
    }

    disableSlaChecker();
    console.log("SLTool: SLA Checker disabled.");
}

// Function to disable the SLA Checker and restore the row-color class
function disableSlaChecker() {
    let rowIndex = 1;
    while (true) {
        let firstColumnXPathForRow = getColumnXPath("Current Owner", rowIndex);
        if (!firstColumnXPathForRow) break;

        let firstColumnResult = document.evaluate(firstColumnXPathForRow, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        let firstColumnElement = firstColumnResult.singleNodeValue;

        // If the first attempt fails, try the alternative DOM structure
        if (!firstColumnElement) {
            firstColumnXPathForRow = firstColumnXPathForRow.replace("/div/span", "/div"); // Adjust XPath for alternative structure
            firstColumnResult = document.evaluate(firstColumnXPathForRow, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            firstColumnElement = firstColumnResult.singleNodeValue;
        }

        // If the element is still not found, exit the loop
        if (!firstColumnElement) {
            break;
        }

        // Remove background color from both possible parent elements
        const parentElement = firstColumnElement.parentElement;
        const parentParentElement = firstColumnElement.parentElement?.parentElement;

        if (parentElement) {
            parentElement.style.removeProperty("background-color");
            parentElement.style.removeProperty("background-image");
        }

        if (parentParentElement) {
            parentParentElement.style.removeProperty("background-color");
            parentParentElement.style.removeProperty("background-image");
        }

        // Restore the row-color class
        firstColumnElement.classList.add("row-color");

        rowIndex++;
    }
}

function calculateGradientColor(caseStage, timeDifferenceInMinutes) {
    let thresholds, colors;

    if (caseStage === "Assessment") {
        thresholds = [30, 60]; // Thresholds for Assessment
        colors = [
            { r: 0, g: 255, b: 0 }, // Green
            { r: 240, g: 165, b: 0 }, // Orange
            { r: 230, g: 0, b: 0 } // Red
        ];
    } else if (caseStage === "Awaiting Analyst") {
        thresholds = [5, 15]; // Thresholds for Awaiting Analyst
        colors = [
            { r: 0, g: 255, b: 0 }, // Green
            { r: 240, g: 165, b: 0 }, // Orange
            { r: 230, g: 0, b: 0 } // Red
        ];
    } else {
        return ""; // Return empty string for unsupported case stages
    }

    if (timeDifferenceInMinutes <= thresholds[0]) {
        const ratio = timeDifferenceInMinutes / thresholds[0];
        const r = Math.floor(colors[0].r + (colors[1].r - colors[0].r) * ratio);
        const g = Math.floor(colors[0].g + (colors[1].g - colors[0].g) * ratio);
        const b = Math.floor(colors[0].b + (colors[1].b - colors[0].b) * ratio);
        return `rgb(${r}, ${g}, ${b}, 0.33)`;
    } else if (thresholds[1] && timeDifferenceInMinutes <= thresholds[1]) {
        const ratio = (timeDifferenceInMinutes - thresholds[0]) / (thresholds[1] - thresholds[0]);
        const r = Math.floor(colors[1].r + (colors[2].r - colors[1].r) * ratio);
        const g = Math.floor(colors[1].g + (colors[2].g - colors[1].g) * ratio);
        const b = Math.floor(colors[1].b + (colors[2].b - colors[1].b) * ratio);
        return `rgb(${r}, ${g}, ${b}, 0.33)`;
    } else {
        return `rgb(${colors[colors.length - 1].r}, ${colors[colors.length - 1].g}, ${colors[colors.length - 1].b}, 0.33)`;
    }
}

// Update the `updateRowColors` function to use the new `calculateGradientColor`
function updateRowColors(rowIndex) {
    const caseStageXPathForRow = getColumnXPath("Case Stage", rowIndex);
    if (!caseStageXPathForRow) return false;

    const caseStageResult = document.evaluate(caseStageXPathForRow, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const caseStageElement = caseStageResult.singleNodeValue;

    if (!caseStageElement) {
        return false;
    }

    const caseStage = caseStageElement.textContent.trim();
    let timeDifferenceInMinutes = 0;
    let gradientColor = "";

    if (caseStage === "Assessment") {
        const slaAssessmentEndXPathForRow = getColumnXPath("SLA Assessment end timer", rowIndex);
        if (!slaAssessmentEndXPathForRow) return true;

        const slaAssessmentEndResult = document.evaluate(slaAssessmentEndXPathForRow, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const slaAssessmentEndElement = slaAssessmentEndResult.singleNodeValue;

        if (!slaAssessmentEndElement) return true;

        const slaAssessmentEndText = slaAssessmentEndElement.textContent.trim();
        const [time, period] = slaAssessmentEndText.split(" ");
        if (!time || !period) return true;

        const [hours, minutes] = time.split(":").map(Number);
        if (isNaN(hours) || isNaN(minutes)) return true;

        const slaAssessmentEndDate = new Date();
        slaAssessmentEndDate.setHours(period === "PM" ? hours + 12 : hours, minutes, 0, 0);

        const currentTime = new Date();
        timeDifferenceInMinutes = Math.floor((currentTime - slaAssessmentEndDate) / (1000 * 60));
        gradientColor = calculateGradientColor(caseStage, timeDifferenceInMinutes);
        applyGradientColor(rowIndex, gradientColor, caseStage);
    } else if (caseStage === "Awaiting Analyst") {
        const awaitingAnalystTimestampXPathForRow = getColumnXPath("Awaiting Analyst Timestamp", rowIndex);
        if (!awaitingAnalystTimestampXPathForRow) return true;

        const awaitingAnalystTimestampResult = document.evaluate(awaitingAnalystTimestampXPathForRow, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const awaitingAnalystTimestampElement = awaitingAnalystTimestampResult.singleNodeValue;

        if (!awaitingAnalystTimestampElement) return true;

        const awaitingAnalystTimestampText = awaitingAnalystTimestampElement.textContent.trim();
        const awaitingAnalystTimestampDate = new Date(awaitingAnalystTimestampText);
        if (isNaN(awaitingAnalystTimestampDate.getTime())) return true;

        const currentTime = new Date();
        timeDifferenceInMinutes = Math.floor((currentTime - awaitingAnalystTimestampDate) / (1000 * 60));
        gradientColor = calculateGradientColor(caseStage, timeDifferenceInMinutes);
        applyGradientColor(rowIndex, gradientColor, caseStage);
    } else if (caseStage === "Analyst Follow Up") {
        applySolidColor(rowIndex, "rgb(10, 205, 240, 0.33)");
    } else if (caseStage === "Response Received") {
        applySolidColor(rowIndex, "rgb(147, 52, 255, 0.33)");
    } else {
        return true;
    }

    return true;
}

function applySolidColor(rowIndex, color) {
    let firstColumnXPathForRow = getColumnXPath("Current Owner", rowIndex); // Replace with actual header name
    // console.log(`SLTool: Generated XPath for Current Owner: ${firstColumnXPathForRow}`);

    if (!firstColumnXPathForRow) {
        // console.warn(`SLTool: XPath for Current Owner not found for row ${rowIndex}`);
        return;
    }

    // Attempt to resolve the first DOM structure
    let firstColumnResult = document.evaluate(firstColumnXPathForRow, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    let firstColumnElement = firstColumnResult.singleNodeValue;

    // Flag to track if the XPath was adjusted
    let isXPathAdjusted = false;

    // If the first attempt fails, try the alternative DOM structure
    if (!firstColumnElement) {
        // console.warn(`SLTool: No Current Owner element found for row ${rowIndex} using initial XPath.`);
        firstColumnXPathForRow = firstColumnXPathForRow.replace("/div/span", "/div"); // Adjust XPath for alternative structure
        // console.log(`SLTool: Trying alternative XPath for Current Owner: ${firstColumnXPathForRow}`);
        firstColumnResult = document.evaluate(firstColumnXPathForRow, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        firstColumnElement = firstColumnResult.singleNodeValue;
        isXPathAdjusted = true; // Mark that the XPath was adjusted
    }

    // If the element is still not found, log a warning and exit
    if (!firstColumnElement) {
        // console.warn(`SLTool: No Current Owner element found for row ${rowIndex} after trying both DOM structures.`);
        return;
    }

    // Determine which DOM structure to use based on whether the XPath was adjusted
    if (isXPathAdjusted) {
        // Apply solid color to the parent element if the XPath was adjusted
        const parentElement = firstColumnElement.parentElement;
        if (parentElement) {
            // console.log(`SLTool: Applying solid color to parent element for row ${rowIndex}: ${color}`);
            parentElement.style.setProperty("background-color", color, "important");
            parentElement.style.backgroundImage = "none"; // Remove any background image
        } else {
            // console.warn(`SLTool: Parent element not found for row ${rowIndex}`);
        }
    } else {
        // Apply solid color to the parent of the parent element if the XPath was not adjusted
        const parentParentElement = firstColumnElement.parentElement?.parentElement;
        if (parentParentElement) {
            // console.log(`Applying solid color to parent of parent for row ${rowIndex}: ${color}`);
            parentParentElement.style.setProperty("background-color", color, "important");
            parentParentElement.style.backgroundImage = "none"; // Remove any background image
        } else {
            // console.warn(`SLTool: Parent's parent element not found for row ${rowIndex}`);
        }
    }
}

function applyGradientColor(rowIndex, gradientColor, caseStage) {
    let firstColumnXPathForRow = getColumnXPath("Current Owner", rowIndex); // Replace with actual header name
    // console.log(`SLTool: Generated XPath for Current Owner: ${firstColumnXPathForRow}`);

    // Adjust XPath for Awaiting Analyst case stage
    if (caseStage === "Awaiting Analyst") {
        firstColumnXPathForRow = firstColumnXPathForRow.replace("/div/span", "/div");
        // console.log(`SLTool: Adjusted XPath for Awaiting Analyst: ${firstColumnXPathForRow}`);
    }

    if (!firstColumnXPathForRow) {
        // console.warn(`SLTool: XPath for Current Owner not found for row ${rowIndex}`);
        return;
    }

    const firstColumnResult = document.evaluate(firstColumnXPathForRow, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    const firstColumnElement = firstColumnResult.singleNodeValue;

    if (!firstColumnElement) {
        // console.warn(`SLTool: No Current Owner element found for row ${rowIndex}.`);
        // console.log(`SLTool: Generated XPath: ${firstColumnXPathForRow}`);
        return;
    }

    if (caseStage === "Awaiting Analyst") {
        const parentElement = firstColumnElement.parentElement;
        if (parentElement) {
            if (gradientColor === "rgb(230, 0, 0, 0.33)") {
                parentElement.style.setProperty("background-color", "rgb(255, 0, 0)", "important");
                parentElement.style.backgroundImage = "none";
                setTimeout(() => {
                    parentElement.style.setProperty("background-color", gradientColor, "important");
                }, 500); // Flash duration (500ms)
            } else {
                parentElement.style.setProperty("background-color", gradientColor, "important");
                parentElement.style.backgroundImage = "none";
            }
        } else {
            // console.warn(`SLTool: Parent element not found for row ${rowIndex}`);
        }
    } else {
        const parentParentElement = firstColumnElement.parentElement?.parentElement;
        if (parentParentElement) {
            parentParentElement.style.setProperty("background-color", gradientColor, "important");
            parentParentElement.style.backgroundImage = "none";
        } else {
            // console.warn(`SLTool: Parent's parent element not found for row ${rowIndex}`);
        }
    }
}

// update colors for all rows
function updateAllRows() {
    console.log("SLTool: Updating all rows...");
    let rowIndex = 1;
    while (updateRowColors(rowIndex)) {
        rowIndex++;
    }
}