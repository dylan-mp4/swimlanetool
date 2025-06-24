// Utility: Recursively search for a selector, traversing shadow roots if needed
function queryDeep(selector, root = document) {
    let element = root.querySelector(selector);
    if (element) return element;
    const nodes = root.querySelectorAll('*');
    for (let node of nodes) {
        if (node.shadowRoot) {
            element = queryDeep(selector, node.shadowRoot);
            if (element) return element;
        }
    }
    return null;
}

// --- Globals ---
let slaCheckerIntervalId = null;
let headerIndexMap = {};
let disableSeverityHighlighting = false;
var debugMode = false;
var debugLogLevel = 0;

// --- Logging ---
function log(message, level = 3, ...args) {
    if (debugMode && debugLogLevel >= level) {
        console.log(`SLTool: ${message}`, ...args);
    }
}

// --- Header Indexing ---
function indexHeaders() {
    headerIndexMap = {};
    const table = queryDeep('ngx-datatable');
    if (!table) {
        log("No ngx-datatable found for header indexing.", 2);
        return;
    }
    const headers = table.querySelectorAll('datatable-header-cell');
    headers.forEach((header, idx) => {
        const text = header.textContent.trim();
        if (text) headerIndexMap[text] = idx;
    });
    log("Header indexing complete.", 4, headerIndexMap);
}

// --- Row/Cell Access ---
function getRowElements() {
    const table = queryDeep('ngx-datatable');
    if (!table) return [];
    return Array.from(table.querySelectorAll('datatable-body-row'));
}

function getCellByHeader(rowElem, headerName) {
    if (!headerIndexMap.hasOwnProperty(headerName)) return null;
    const cells = rowElem.querySelectorAll('datatable-body-cell');
    return cells[headerIndexMap[headerName]] || null;
}

// --- SLA Checker Functions ---
function startSlaChecker() {
    indexHeaders();
    updateAllRows();

    if (slaCheckerIntervalId) clearInterval(slaCheckerIntervalId);

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
    indexHeaders();
    const rows = getRowElements();
    Object.keys(headerIndexMap).forEach(headerName => {
        rows.forEach(row => {
            const cell = getCellByHeader(row, headerName);
            if (cell) applyStyles(cell, { "background-color": "rgba(0,0,0,0)", "background-image": "" });
        });
    });
}

// --- Row Update Functions ---
function updateAllRows() {
    log("Updating all rows...", 3);
    const rows = getRowElements();
    rows.forEach((row, idx) => {
        updateRowColors(row, idx);
        if (!disableSeverityHighlighting) {
            colorSeverityColumn(row);
        } else {
            const cell = getCellByHeader(row, "Severity");
            if (cell) applyStyles(cell, { "background-color": "rgba(0,0,0,0)" });
        }
    });
}

function updateRowColors(rowElem, rowIndex) {
    const caseStageCell = getCellByHeader(rowElem, "Case Stage");
    if (!caseStageCell) return false;

    const caseStage = caseStageCell.textContent.trim();
    let gradientColor = "";
    let timeElapsedInMinutes = 0;

    if (caseStage === "Assessment") {
        try {
            timeElapsedInMinutes = calculateTimeElapsedForRow(rowElem, "Assessment Timestamp");
            if (isNaN(timeElapsedInMinutes) || timeElapsedInMinutes === null) {
                timeElapsedInMinutes = calculateTimeElapsedForRow(rowElem, "SLA Assessment end timer");
            }
        } catch (e) {
            timeElapsedInMinutes = calculateTimeElapsedForRow(rowElem, "SLA Assessment end timer");
        }
        gradientColor = calculateGradientColor(caseStage, timeElapsedInMinutes);
    } else if (caseStage === "Awaiting Analyst") {
        timeElapsedInMinutes = calculateTimeElapsedForRow(rowElem, "Awaiting Analyst Timestamp");
        gradientColor = calculateGradientColor(caseStage, timeElapsedInMinutes);
    } else if (caseStage === "Analyst Follow Up") {
        gradientColor = "rgb(10, 205, 240, 0.33)";
    } else if (caseStage === "Response Received") {
        gradientColor = "rgb(147, 52, 255, 0.33)";
    } else {
        return true;
    }

    log(`Row ${rowIndex + 1}: Case Stage: ${caseStage}, Time Elapsed: ${timeElapsedInMinutes}, Gradient: ${gradientColor}`, 4);
    applyGradientColor(rowElem, gradientColor, caseStage, timeElapsedInMinutes);
    return true;
}

function calculateTimeElapsedForRow(rowElem, headerName) {
    const cell = getCellByHeader(rowElem, headerName);
    if (!cell) return NaN;
    const timestampText = cell.textContent.trim();
    return calculateTimeElapsed(timestampText);
}

function calculateTimeElapsed(timestampText) {
    let timestampDate;
    if (/^\d{1,2}:\d{2} (AM|PM)$/.test(timestampText)) {
        const [time, period] = timestampText.split(" ");
        const [hours, minutes] = time.split(":").map(Number);
        if (isNaN(hours) || isNaN(minutes)) return NaN;
        timestampDate = new Date();
        timestampDate.setHours(period === "PM" && hours !== 12 ? hours + 12 : hours, minutes, 0, 0);
    } else {
        timestampDate = new Date(timestampText);
        if (isNaN(timestampDate.getTime())) return NaN;
    }
    const currentTime = new Date();
    return Math.floor((currentTime - timestampDate) / (1000 * 60));
}

function calculateGradientColor(caseStage, timeElapsedInMinutes) {
    let thresholds, colors;
    if (caseStage === "Assessment") {
        thresholds = [0, 30, 55];
    } else if (caseStage === "Awaiting Analyst") {
        thresholds = [0, 5, 12];
    } else {
        return "rgb(255, 255, 255, 0)";
    }
    colors = [
        { r: 0, g: 255, b: 0 },
        { r: 240, g: 165, b: 0 },
        { r: 230, g: 0, b: 0 }
    ];
    if (timeElapsedInMinutes <= thresholds[0]) {
        return `rgb(${colors[0].r}, ${colors[0].g}, ${colors[0].b}, 0.33)`;
    } else if (timeElapsedInMinutes <= thresholds[1]) {
        const ratio = (timeElapsedInMinutes - thresholds[0]) / (thresholds[1] - thresholds[0]);
        return interpolateColor(colors[0], colors[1], ratio);
    } else if (timeElapsedInMinutes <= thresholds[2]) {
        const ratio = (timeElapsedInMinutes - thresholds[1]) / (thresholds[2] - thresholds[1]);
        return interpolateColor(colors[1], colors[2], ratio);
    } else {
        return `rgb(${colors[2].r}, ${colors[2].g}, ${colors[2].b}, 0.33)`;
    }
}

function interpolateColor(color1, color2, ratio) {
    const r = Math.round(color1.r + (color2.r - color1.r) * ratio);
    const g = Math.round(color1.g + (color2.g - color1.g) * ratio);
    const b = Math.round(color1.b + (color2.b - color1.b) * ratio);
    return `rgb(${r}, ${g}, ${b}, 0.33)`;
}

function applyGradientColor(rowElem, gradientColor, caseStage, timeDifferenceInMinutes) {
    chrome.storage.sync.get(["disableFlashing", "highlightColumns"], (data) => {
        const disableFlashing = !!data.disableFlashing;
        let highlightColumns = Array.isArray(data.highlightColumns) ? data.highlightColumns : [];
        if (!highlightColumns.length) {
            highlightColumns = Object.keys(headerIndexMap);
        }
        if (caseStage === "Awaiting Analyst" && timeDifferenceInMinutes > 12) {
            if (!disableFlashing) {
                highlightColumns.forEach(headerName => {
                    if (headerName === "Severity") return;
                    const cell = getCellByHeader(rowElem, headerName);
                    if (cell) {
                        applyStyles(cell, { "background-color": "rgba(230,0,0,1)", "background-image": "none" });
                        setTimeout(() => {
                            applyStyles(cell, { "background-color": gradientColor, "background-image": "none" });
                        }, 500);
                    }
                });
                return;
            } else {
                highlightColumns.forEach(headerName => {
                    if (headerName === "Severity") return;
                    const cell = getCellByHeader(rowElem, headerName);
                    if (cell) {
                        applyStyles(cell, { "background-color": gradientColor, "background-image": "none" });
                    }
                });
            }
        } else {
            highlightColumns.forEach(headerName => {
                const cell = getCellByHeader(rowElem, headerName);
                if (cell) {
                    applyStyles(cell, { "background-color": gradientColor, "background-image": "none" });
                }
            });
        }
    });
}

function applyStyles(element, styles) {
    if (!element) return;
    Object.entries(styles).forEach(([key, value]) => {
        element.style.setProperty(key, value, "important");
    });
}

function colorSeverityColumn(rowElem) {
    const cell = getCellByHeader(rowElem, "Severity");
    if (!cell) return;
    const value = cell.textContent.trim();
    let color = "";
    switch (value) {
        case "Unknown": color = "rgba(255,105,180,0.5)"; break;
        case "Informational": color = "rgba(0,255,255,0.5)"; break;
        case "Low": color = "rgba(0,128,0,0.5)"; break;
        case "Medium": color = "rgba(255,165,0,0.5)"; break;
        case "High": color = "rgba(255,0,0,0.5)"; break;
        case "Critical": color = "rgba(0,0,255,0.5)"; break;
        default: color = "";
    }
    if (color) applyStyles(cell, { "background-color": color });
}

// --- Event Listeners ---
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
        indexHeaders();
        const highlightColumns = Array.isArray(request.highlightColumns) ? request.highlightColumns : [];
        const rows = getRowElements();
        Object.keys(headerIndexMap).forEach(headerName => {
            rows.forEach(row => {
                if (!highlightColumns.includes(headerName)) {
                    const cell = getCellByHeader(row, headerName);
                    if (cell) applyStyles(cell, { "background-color": "rgba(0,0,0,0)", "background-image": "" });
                }
            });
        });
    }
});

function waitForCasesToLoad() {
    // Try to find the table and at least one row
    const table = queryDeep('ngx-datatable');
    if (table) {
        const rows = table.querySelectorAll('datatable-body-row');
        if (rows.length > 0) {
            log("Cases loaded. Starting SLA Checker...", 3);
            startSlaChecker();
            return;
        }
    }
    log("No cases found. Retrying in 1 second...", 3);
    setTimeout(waitForCasesToLoad, 1000);
}

window.addEventListener("beforeunload", () => {
    stopSlaChecker();
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