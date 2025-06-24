// Constants
const XPATHS = {
    row: (rowIndex) => `/html/body/app-root/div/div/div/div/app-search/div/div[2]/div[2]/app-search-list/div/ngx-datatable/div/datatable-body/datatable-selection/datatable-scroller/datatable-row-wrapper[${rowIndex}]/datatable-body-row`,
    column: (rowIndex, columnIndex) => `/html/body/app-root/div/div/div/div/app-search/div/div[2]/div[2]/app-search-list/div/ngx-datatable/div/datatable-body/datatable-selection/datatable-scroller/datatable-row-wrapper[${rowIndex}]/datatable-body-row/div[2]/datatable-body-cell[${columnIndex}]/div/span`,
    header: `/html/body/app-root/div/div/div/div/app-search/div/div[2]/div[2]/app-search-list/div/ngx-datatable/div/datatable-header/div/div[2]/datatable-header-cell`
};

let slaCheckerIntervalId = null;
let headerIndexMap = {};
let disableSeverityHighlighting = false;
var debugMode = false;
var debugLogLevel = 0;

function log(message, level = 3, ...args) {
    if (debugMode && debugLogLevel >= level) {
        console.log(`SLTool: ${message}`, ...args);
    }
}

function evaluateXPath(xpath, context = document) {
    if (!xpath) {
        log("Invalid XPath provided to evaluateXPath.", 1);
        return null;
    }

    let node = document.evaluate(xpath, context, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

    // If the node is null, try to resolve the parent `datatable-body-cell` directly
    if (!node) {
        const parentXPath = xpath.replace(/\/div\/span$/, ""); // Remove `/div/span` to target the parent cell
        node = document.evaluate(parentXPath, context, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    }

    // Ensure we return the `datatable-body-cell` element
    if (node) {
        return node.closest("datatable-body-cell") || node;
    }

    return null;
}

function calculateTimeElapsed(timestampText) {
    let timestampDate;

    // Handle "HH:MM AM/PM" format
    if (/^\d{1,2}:\d{2} (AM|PM)$/.test(timestampText)) {
        const [time, period] = timestampText.split(" ");
        const [hours, minutes] = time.split(":").map(Number);
        if (isNaN(hours) || isNaN(minutes)) return NaN;

        timestampDate = new Date();
        timestampDate.setHours(period === "PM" && hours !== 12 ? hours + 12 : hours, minutes, 0, 0);
    }
    // Handle long format (e.g., "DAY N, YYYY HH:MM AM/PM +01:00")
    else {
        timestampDate = new Date(timestampText);
        if (isNaN(timestampDate.getTime())) return NaN; // Invalid date
    }

    const currentTime = new Date();
    return Math.floor((currentTime - timestampDate) / (1000 * 60)); // Time elapsed in minutes
}

function applyStyles(element, styles) {
    if (!element) return;
    Object.entries(styles).forEach(([key, value]) => {
        element.style.setProperty(key, value, "important");
    });
}

// Header Indexing
function indexHeaders() {
    headerIndexMap = {};
    const headerNodesSnapshot = document.evaluate(XPATHS.header, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

    for (let i = 0; i < headerNodesSnapshot.snapshotLength; i++) {
        const headerElement = headerNodesSnapshot.snapshotItem(i);
        const headerText = headerElement.querySelector("span > span")?.textContent?.trim();
        if (headerText) {
            headerIndexMap[headerText] = i + 1; // Store the column index (1-based)
        }
    }
    log("Header indexing complete.", 4);
}

function getColumnXPath(headerName, rowIndex, targetSpan = true) {
    const columnIndex = headerIndexMap[headerName];
    if (!columnIndex) {
        log(`Header "${headerName}" not found in the indexed headers.`, 2);
        return null;
    }
    // If targetSpan is true, target the <span>, otherwise target the parent <div>
    return targetSpan
        ? XPATHS.column(rowIndex, columnIndex)
        : `/html/body/app-root/div/div/div/div/app-search/div/div[2]/div[2]/app-search-list/div/ngx-datatable/div/datatable-body/datatable-selection/datatable-scroller/datatable-row-wrapper[${rowIndex}]/datatable-body-row/div[2]/datatable-body-cell[${columnIndex}]`
}

// SLA Checker Functions
function startSlaChecker() {
    indexHeaders();
    updateAllRows();

    if (slaCheckerIntervalId) {
        clearInterval(slaCheckerIntervalId);
    }

    slaCheckerIntervalId = setInterval(() => {
        if (document.readyState !== "complete") {
            log("SLTool: Document is not ready. Stopping SLA Checker.", 2);
            stopSlaChecker();
            return;
        }
        indexHeaders();
        updateAllRows();
    }, 1000);

    log("SLA Checker enabled.", 3);
}

function stopSlaChecker() {
    if (slaCheckerIntervalId) {
        clearInterval(slaCheckerIntervalId);
        slaCheckerIntervalId = null;
    }
    disableSlaChecker();
    log("SLA Checker disabled.", 3);
}

function disableSlaChecker() {
    // Ensure headers are indexed
    indexHeaders();

    // Get all header names (columns)
    const allHeaders = Object.keys(headerIndexMap);

    let rowIndex = 1;
    while (true) {
        // Check if the row exists by checking the first column
        const firstColumnXPathForRow = getColumnXPath(allHeaders[0], rowIndex);
        if (!firstColumnXPathForRow) break;

        const firstColumnElement = evaluateXPath(firstColumnXPathForRow);
        if (!firstColumnElement) break;

        // Remove background color from all columns in this row
        allHeaders.forEach((headerName) => {
            const columnXPath = getColumnXPath(headerName, rowIndex);
            const columnElement = evaluateXPath(columnXPath);
            if (columnElement) {
                applyStyles(columnElement, { "background-color": "rgba(0,0,0,0)", "background-image": "" });
            }
        });

        rowIndex++;
    }
}

// Row Update Functions
function updateAllRows() {
    log("Updating all rows...", 3);
    let rowIndex = 1;
    while (updateRowColors(rowIndex)) {
        if (!disableSeverityHighlighting) {
            colorSeverityColumn(rowIndex);
        } else {
            // Remove severity highlight if present
            const severityHeader = "Severity";
            const severityXPath = getColumnXPath(severityHeader, rowIndex);
            const severityElement = evaluateXPath(severityXPath);
            if (severityElement) {
                applyStyles(severityElement, { "background-color": "rgba(0,0,0,0)" });
            }
        }
        rowIndex++;
    }
}


function updateRowColors(rowIndex) {
    const caseStageXPath = getColumnXPath("Case Stage", rowIndex);
    const caseStageElement = evaluateXPath(caseStageXPath);
    if (!caseStageElement) return false;

    const caseStage = caseStageElement.textContent.trim();
    let gradientColor = "";
    let timeElapsedInMinutes = 0;

    if (caseStage === "Assessment") {
        let timeElapsedInMinutes;
        try {
            timeElapsedInMinutes = calculateTimeElapsedForRow(rowIndex, "Assessment Timestamp");
            if (isNaN(timeElapsedInMinutes) || timeElapsedInMinutes === null) {
                timeElapsedInMinutes = calculateTimeElapsedForRow(rowIndex, "SLA Assessment end timer");
            }
        } catch (e) {
            timeElapsedInMinutes = calculateTimeElapsedForRow(rowIndex, "SLA Assessment end timer");
        }
        gradientColor = calculateGradientColor(caseStage, timeElapsedInMinutes);
    } else if (caseStage === "Awaiting Analyst") {
        timeElapsedInMinutes = calculateTimeElapsedForRow(rowIndex, "Awaiting Analyst Timestamp");
        gradientColor = calculateGradientColor(caseStage, timeElapsedInMinutes);
    } else if (caseStage === "Analyst Follow Up") {
        gradientColor = "rgb(10, 205, 240, 0.33)";
    } else if (caseStage === "Response Received") {
        gradientColor = "rgb(147, 52, 255, 0.33)";
    } else {
        return true;
    }

    log(`Row ${rowIndex}: Case Stage: ${caseStage}, Time Elapsed: ${timeElapsedInMinutes}, Gradient: ${gradientColor}`, 4);
    applyGradientColor(rowIndex, gradientColor, caseStage, timeElapsedInMinutes);
    return true;
}

function calculateTimeElapsedForRow(rowIndex, headerName) {
    const timestampXPath = getColumnXPath(headerName, rowIndex);
    const timestampElement = evaluateXPath(timestampXPath);
    if (!timestampElement) return NaN;

    const timestampText = timestampElement.textContent.trim();
    return calculateTimeElapsed(timestampText);
}

function calculateGradientColor(caseStage, timeElapsedInMinutes) {
    let thresholds, colors;

    // Define thresholds and colors based on the case stage
    if (caseStage === "Assessment") {
        thresholds = [0, 30, 55]; // Green at 0, Orange at 30, Red at 55
    } else if (caseStage === "Awaiting Analyst") {
        thresholds = [0, 5, 12]; // Green at 0, Orange at 5, Red at 12
    } else {
        return "rgb(255, 255, 255, 0)"; // Default to transparent if caseStage is not recognized
    }

    colors = [
        { r: 0, g: 255, b: 0 }, // Green
        { r: 240, g: 165, b: 0 }, // Orange
        { r: 230, g: 0, b: 0 } // Red
    ];

    // Determine the gradient color based on the time elapsed
    if (timeElapsedInMinutes <= thresholds[0]) {
        // Fully green
        return `rgb(${colors[0].r}, ${colors[0].g}, ${colors[0].b}, 0.33)`;
    } else if (timeElapsedInMinutes <= thresholds[1]) {
        // Interpolate between green and orange
        const ratio = (timeElapsedInMinutes - thresholds[0]) / (thresholds[1] - thresholds[0]);
        return interpolateColor(colors[0], colors[1], ratio);
    } else if (timeElapsedInMinutes <= thresholds[2]) {
        // Interpolate between orange and red
        const ratio = (timeElapsedInMinutes - thresholds[1]) / (thresholds[2] - thresholds[1]);
        return interpolateColor(colors[1], colors[2], ratio);
    } else {
        // Fully red for values beyond the highest threshold
        return `rgb(${colors[2].r}, ${colors[2].g}, ${colors[2].b}, 0.33)`;
    }
}


function interpolateColor(color1, color2, ratio) {
    const r = Math.round(color1.r + (color2.r - color1.r) * ratio);
    const g = Math.round(color1.g + (color2.g - color1.g) * ratio);
    const b = Math.round(color1.b + (color2.b - color1.b) * ratio);
    return `rgb(${r}, ${g}, ${b}, 0.33)`;
}

function applyGradientColor(rowIndex, gradientColor, caseStage, timeDifferenceInMinutes) {
    // Always use the first column by index as default
    const allHeaders = Object.keys(headerIndexMap);
    const defaultColumn = allHeaders[0];

    chrome.storage.sync.get(["disableFlashing", "highlightColumns"], (data) => {
        const disableFlashing = !!data.disableFlashing;
        let highlightColumns = Array.isArray(data.highlightColumns) ? data.highlightColumns : [];
        if (!highlightColumns.length && defaultColumn) {
            highlightColumns = [defaultColumn];
        }
        if (caseStage === "Awaiting Analyst" && timeDifferenceInMinutes > 12) {
            if (!disableFlashing) {
                // Flash red for 500ms, then revert to gradient
                highlightColumns.forEach((headerName) => {
                    if (headerName === "Severity") return; // Skip Severity column
                    const columnXPath = getColumnXPath(headerName, rowIndex);
                    const columnElement = evaluateXPath(columnXPath);
                    if (columnElement && document.body.contains(columnElement)) {
                        applyStyles(columnElement, { "background-color": "rgba(230,0,0,1)", "background-image": "none" });
                        setTimeout(() => {
                            applyStyles(columnElement, { "background-color": gradientColor, "background-image": "none" });
                        }, 500);
                    }
                });
                return;
            } else {
                // If flashing is disabled, just apply the gradient
                highlightColumns.forEach((headerName) => {
                    if (headerName === "Severity") return; // Skip Severity column
                    const columnXPath = getColumnXPath(headerName, rowIndex);
                    const columnElement = evaluateXPath(columnXPath);
                    if (columnElement && document.body.contains(columnElement)) {
                        applyStyles(columnElement, { "background-color": gradientColor, "background-image": "none" });
                    }
                });
            }
        } else {
            // Default behavior for other stages or if not flashing
            highlightColumns.forEach((headerName) => {
                const columnXPath = getColumnXPath(headerName, rowIndex);
                const columnElement = evaluateXPath(columnXPath);
                if (columnElement && document.body.contains(columnElement)) {
                    applyStyles(columnElement, { "background-color": gradientColor, "background-image": "none" });
                }
            });
        }
    });
}

function applyColorToColumns(rowIndex, color, caseStage, timeDifferenceInMinutes) {
    chrome.storage.sync.get(["highlightColumns"], (data) => {
        let highlightColumns = Array.isArray(data.highlightColumns) ? data.highlightColumns : [];
        const allHeaders = Object.keys(headerIndexMap);
        if (!highlightColumns.length && allHeaders.length > 0) {
            highlightColumns = [allHeaders[0]];
        }
        highlightColumns.forEach((headerName) => {
            if (headerName === "Severity") return; // Skip Severity column
            const columnXPath = getColumnXPath(headerName, rowIndex);
            const columnElement = evaluateXPath(columnXPath);
            if (!columnElement || !document.body.contains(columnElement)) return;
            applyStyles(columnElement, { "background-color": color, "background-image": "none" });
        });
    });
}

function colorSeverityColumn(rowIndex) {
    const severityHeader = "Severity";
    const severityXPath = getColumnXPath(severityHeader, rowIndex);
    const severityElement = evaluateXPath(severityXPath);
    if (!severityElement) return;

    const value = severityElement.textContent.trim();
    let color = "";
    switch (value) {
        case "Unknown":
            color = "rgba(255,105,180,0.5)";
            break;
        case "Informational":
            color = "rgba(0,255,255,0.5)";
            break;
        case "Low":
            color = "rgba(0,128,0,0.5)";
            break;
        case "Medium":
            color = "rgba(255,165,0,0.5)";
            break;
        case "High":
            color = "rgba(255,0,0,0.5)";
            break;
        case "Critical":
            color = "rgba(0,0,255,0.5)";
            break;
        default:
            color = "";
    }
    if (color) {
        applyStyles(severityElement, { "background-color": color });
    }
}
// Event Listeners
window.addEventListener("load", () => {
    chrome.storage.sync.get(["slaCheckerEnabled"], (data) => {
        if (data.slaCheckerEnabled) {
            log("SLTool: Waiting for cases to load...", 3);
            waitForCasesToLoad();
        }
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getHeaders") {
        sendResponse({ headers: Object.keys(headerIndexMap) });
    } else if (request.action === "updateDisableSeverity") {
        disableSeverityHighlighting = !!request.disableSeverity;
    } else if (request.action === "updateSlaChecker") {
        if (request.enabled) {
            startSlaChecker();
        } else {
            stopSlaChecker();
        }
        sendResponse({ status: "success" });
    } else if (request.action === "updateHighlightColumns") {
        // Remove color from all columns not in highlightColumns
        indexHeaders();
        const allHeaders = Object.keys(headerIndexMap);
        const highlightColumns = Array.isArray(request.highlightColumns) ? request.highlightColumns : [];
        let rowIndex = 1;
        while (true) {
            const firstColumnXPathForRow = getColumnXPath(allHeaders[0], rowIndex);
            if (!firstColumnXPathForRow) break;
            const firstColumnElement = evaluateXPath(firstColumnXPathForRow);
            if (!firstColumnElement) break;
            allHeaders.forEach((headerName) => {
                if (!highlightColumns.includes(headerName)) {
                    const columnXPath = getColumnXPath(headerName, rowIndex);
                    const columnElement = evaluateXPath(columnXPath);
                    if (columnElement) {
                        applyStyles(columnElement, { "background-color": "rgba(0,0,0,0)", "background-image": "" });
                    }
                }
            });
            rowIndex++;
        }
    }
});

function waitForCasesToLoad() {
    // const totalCasesXPath = "/html/body/app-root/div/div/div/div/ui-view/app-search/div/div[2]/div[2]/app-search-list/div[2]/ngx-datatable/div/datatable-footer/div/div/text()";
    // const totalCasesXPath = "/html/body/app-root/div/div/div/div/app-search/div/div[2]/div[2]/app-search-list/div[2]/ngx-datatable/div/datatable-footer/div/div/text()";
    const totalCasesXPath = "/html/body/app-root/div/div/div/div/app-search/div/div[2]/div[2]/app-search-list/div/ngx-datatable/div/datatable-footer/div/div/text()";
    const result = document.evaluate(totalCasesXPath, document, null, XPathResult.STRING_TYPE, null);
    const totalCasesText = result.stringValue.trim();

    const match = totalCasesText.match(/\d+/);
    if (match) {
        const totalCases = parseInt(match[0], 10);
        if (totalCases > 0) {
            log("Cases loaded. Starting SLA Checker...", 3);
            startSlaChecker();
        } else {
            log("No cases found. Retrying in 1 second...", 3);
            setTimeout(waitForCasesToLoad, 1000);
        }
    } else {
        log("Unable to retrieve total cases. Retrying in 1 second...", 3);
        setTimeout(waitForCasesToLoad, 1000);
    }
}

window.addEventListener("beforeunload", () => {
    stopSlaChecker(); // Stop the SLA Checker when the page is unloaded
});

// On load, initialize from storage
chrome.storage.sync.get(['disableSeverity', 'debugMode', 'debugLogLevel'], (data) => {
    if (data.disableSeverity !== undefined) {
        disableSeverityHighlighting = !!data.disableSeverity;
        log('Loaded disableSeverityHighlighting:', 3, disableSeverityHighlighting);
    }
    if (data.debugMode !== undefined) {
        debugMode = !!data.debugMode;
        log('Loaded debug mode state:', 3, debugMode);
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
