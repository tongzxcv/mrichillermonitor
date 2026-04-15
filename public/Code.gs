/**
 * MRI Chiller Monitor - Google Apps Script backend
 *
 * Required sheets:
 * 1. SensorData
 *    Header: timestamp, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10
 * 2. Config
 *    Header: sensorId, name, threshold, color
 */

var SENSOR_SHEET_NAME = 'SensorData';
var CONFIG_SHEET_NAME = 'Config';
var COMMAND_SHEET_NAME = 'Commands';
var HISTORY_MAX = 288;
var REBOOT_AUTH_TOKEN_PROPERTY = 'REBOOT_AUTH_TOKEN';
var REBOOT_COMMAND_PROPERTY = 'PENDING_REBOOT_COMMAND';

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'getLatestData';
  var callback = (e && e.parameter && e.parameter.callback) || '';
  var result;

  switch (action) {
    case 'latest':
    case 'getLatestData':
      result = getLatestData();
      break;
    case 'history':
    case 'getHistoryData':
      result = getHistoryData((e.parameter && e.parameter.date) || '');
      break;
    case 'getChartHistory':
      result = getChartHistory();
      break;
    case 'config':
    case 'getConfig':
      result = getConfig();
      break;
    case 'exportCsv':
      result = getExportData(
        (e.parameter && e.parameter.startDate) || '',
        (e.parameter && e.parameter.endDate) || '',
        ((e.parameter && e.parameter.sensors) || '').split(',').filter(String)
      );
      break;
    case 'reboot':
    case 'setRebootCommand':
      result = handleSecureReboot((e.parameter && e.parameter.authToken) || '');
      break;
    default:
      result = { error: 'Unknown action: ' + action };
      break;
  }

  return outputJson(result, callback);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    var action = body.action || '';
    var result;

    switch (action) {
      case 'log':
        result = logSensorData(body.data || {});
        break;
      case 'updateConfig':
        result = updateConfig(body.config || []);
        break;
      default:
        result = { error: 'Unknown POST action: ' + action };
        break;
    }

    return outputJson(result, '');
  } catch (error) {
    return outputJson({ error: String(error) }, '');
  }
}

function outputJson(payload, callback) {
  var json = JSON.stringify(payload);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function getLatestData() {
  var context = getSensorSheetContext();
  if (context.error) return context.error;
  if (context.rows.length === 0) return { sensors: [], timestamp: null };

  var config = getConfigMap();
  var historyRows = context.rows.slice(Math.max(0, context.rows.length - 20));
  var sensors = [];
  var lastRow = context.rows[context.rows.length - 1];

  for (var col = 1; col < context.headers.length; col++) {
    var sensorId = context.headers[col];
    var cfg = config[sensorId] || { name: sensorId, threshold: 14, color: '#888888' };
    var values = [];
    var history = [];

    for (var rowIndex = 0; rowIndex < historyRows.length; rowIndex++) {
      var rawValue = Number(historyRows[rowIndex][col]);
      var temp = isFinite(rawValue) ? rawValue : 0;
      values.push(temp);
      history.push({
        time: formatTime(historyRows[rowIndex][0]),
        value: temp
      });
    }

    var current = values.length ? values[values.length - 1] : 0;
    var min = values.length ? Math.min.apply(null, values) : 0;
    var max = values.length ? Math.max.apply(null, values) : 0;
    var avg = values.length ? round1(sum(values) / values.length) : 0;

    sensors.push({
      id: sensorId,
      name: cfg.name,
      color: cfg.color,
      current: current,
      min: min,
      max: max,
      avg: avg,
      threshold: cfg.threshold,
      status: current > cfg.threshold ? 'critical' : 'normal',
      history: history
    });
  }

  return {
    sensors: sensors,
    timestamp: formatTimestamp(lastRow[0])
  };
}

function getHistoryData(dateStr) {
  var context = getSensorSheetContext();
  if (context.error) return context.error;

  var range = getDateRange(dateStr, dateStr);
  var data = [];

  for (var rowIndex = 0; rowIndex < context.rows.length; rowIndex++) {
    var row = context.rows[rowIndex];
    var timestamp = parseTimestamp(row[0]);
    if (!timestamp || !isWithinRange(timestamp, range)) continue;

    var point = { time: formatTime(timestamp) };
    for (var col = 1; col < context.headers.length; col++) {
      point[context.headers[col]] = toNumberOrNull(row[col]);
    }
    data.push(point);
  }

  return {
    date: dateStr || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    data: data
  };
}

function getChartHistory() {
  var context = getSensorSheetContext();
  if (context.error) return [];

  var rows = context.rows.slice(Math.max(0, context.rows.length - HISTORY_MAX));
  var points = [];

  for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    var row = rows[rowIndex];
    var vals = [];
    for (var col = 1; col < context.headers.length; col++) {
      vals.push(toNumberOrNull(row[col]));
    }
    points.push({
      time: formatTime(row[0]),
      vals: vals
    });
  }

  return points;
}

function getExportData(startDateStr, endDateStr, selectedSensors) {
  var context = getSensorSheetContext();
  if (context.error) return context.error;

  var range = getDateRange(startDateStr, endDateStr);
  var selectedColumns = getSelectedSensorColumns(context.headers, selectedSensors);
  var rows = [];

  for (var rowIndex = 0; rowIndex < context.rows.length; rowIndex++) {
    var row = context.rows[rowIndex];
    var timestamp = parseTimestamp(row[0]);
    if (!timestamp || !isWithinRange(timestamp, range)) continue;

    var exportRow = {
      timestamp: formatTimestamp(timestamp)
    };

    for (var i = 0; i < selectedColumns.length; i++) {
      var selected = selectedColumns[i];
      exportRow[selected.header] = toNumberOrNull(row[selected.columnIndex]);
    }

    rows.push(exportRow);
  }

  return {
    columns: ['timestamp'].concat(selectedColumns.map(function (item) { return item.header; })),
    rows: rows,
    count: rows.length
  };
}

function getConfig() {
  var sheet = getSheetByName(CONFIG_SHEET_NAME);
  if (!sheet) return { error: 'Sheet "' + CONFIG_SHEET_NAME + '" not found' };

  var values = sheet.getDataRange().getValues();
  var configs = [];
  for (var i = 1; i < values.length; i++) {
    if (!values[i][0]) continue;
    configs.push({
      id: String(values[i][0]),
      name: String(values[i][1] || values[i][0]),
      threshold: Number(values[i][2] || 0),
      color: String(values[i][3] || '#888888')
    });
  }
  return { configs: configs };
}

function getConfigMap() {
  var response = getConfig();
  if (response.error || !response.configs) return {};

  var map = {};
  for (var i = 0; i < response.configs.length; i++) {
    var cfg = response.configs[i];
    map[cfg.id] = {
      name: cfg.name,
      threshold: cfg.threshold,
      color: cfg.color
    };
  }
  return map;
}

function logSensorData(sensorData) {
  var sheet = getSheetByName(SENSOR_SHEET_NAME);
  if (!sheet) return { error: 'Sheet "' + SENSOR_SHEET_NAME + '" not found' };

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = [new Date()];
  for (var col = 1; col < headers.length; col++) {
    row.push(sensorData[headers[col]] || 0);
  }
  sheet.appendRow(row);
  return { success: true, row: sheet.getLastRow() };
}

function updateConfig(configArr) {
  var sheet = getSheetByName(CONFIG_SHEET_NAME);
  if (!sheet) return { error: 'Sheet "' + CONFIG_SHEET_NAME + '" not found' };

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).clearContent();
  }

  for (var i = 0; i < configArr.length; i++) {
    var cfg = configArr[i];
    sheet.getRange(i + 2, 1, 1, 4).setValues([[
      cfg.id,
      cfg.name,
      cfg.threshold,
      cfg.color
    ]]);
  }

  return { success: true };
}

function handleSecureReboot(authToken) {
  if (!isValidRebootAuthToken(authToken)) {
    return { error: 'Unauthorized reboot request' };
  }

  var timestamp = new Date();
  var commandSheet = getOrCreateCommandSheet();
  commandSheet.appendRow([
    timestamp,
    'REBOOT_ALL',
    'queued'
  ]);

  PropertiesService.getScriptProperties().setProperty(
    REBOOT_COMMAND_PROPERTY,
    Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss")
  );

  var boardResult = queueBoardSheetRebootCommand();

  return {
    success: true,
    status: 'ok',
    message: 'Reboot command queued',
    mode: boardResult.mode,
    commandAt: Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss")
  };
}

function getSensorSheetContext() {
  var sheet = getSheetByName(SENSOR_SHEET_NAME);
  if (!sheet) {
    return { error: { error: 'Sheet "' + SENSOR_SHEET_NAME + '" not found' } };
  }

  var values = sheet.getDataRange().getValues();
  if (values.length === 0) {
    return {
      headers: [],
      rows: []
    };
  }

  return {
    headers: values[0],
    rows: values.slice(1)
  };
}

function getSheetByName(name) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet ? spreadsheet.getSheetByName(name) : null;
}

function getOrCreateCommandSheet() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(COMMAND_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(COMMAND_SHEET_NAME);
    sheet.getRange(1, 1, 1, 3).setValues([['timestamp', 'command', 'status']]);
  }
  return sheet;
}

function isValidRebootAuthToken(authToken) {
  var expectedToken = String(
    PropertiesService.getScriptProperties().getProperty(REBOOT_AUTH_TOKEN_PROPERTY) || ''
  ).trim();
  var providedToken = String(authToken || '').trim();

  if (!expectedToken) {
    return false;
  }

  return providedToken === expectedToken;
}

function queueBoardSheetRebootCommand() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var mappings = [
    { prefix: 'Board1', cell: 'H1' },
    { prefix: 'Board2', cell: 'G1' },
    { prefix: 'Board3', cell: 'E1' }
  ];
  var queuedBoards = [];

  for (var i = 0; i < mappings.length; i++) {
    var sheet = findLatestSheetByPrefix(spreadsheet, mappings[i].prefix);
    if (!sheet) continue;
    sheet.getRange(mappings[i].cell).setValue('REBOOT');
    queuedBoards.push(sheet.getName());
  }

  return {
    mode: queuedBoards.length > 0 ? 'board-sheets' : 'command-log',
    sheets: queuedBoards
  };
}

function findLatestSheetByPrefix(spreadsheet, prefix) {
  var sheets = spreadsheet.getSheets();
  var matched = [];

  for (var i = 0; i < sheets.length; i++) {
    if (String(sheets[i].getName()).indexOf(prefix) === 0) {
      matched.push(sheets[i]);
    }
  }

  if (matched.length === 0) return null;

  matched.sort(function(a, b) {
    return b.getName().localeCompare(a.getName());
  });

  return matched[0];
}

function getSelectedSensorColumns(headers, selectedSensors) {
  var normalizedSelections = {};
  var hasSelection = selectedSensors && selectedSensors.length > 0;

  if (hasSelection) {
    for (var i = 0; i < selectedSensors.length; i++) {
      normalizedSelections[normalizeSensorId(selectedSensors[i])] = true;
    }
  }

  var columns = [];
  for (var col = 1; col < headers.length; col++) {
    var header = String(headers[col]);
    var normalizedHeader = normalizeSensorId(header);
    if (!hasSelection || normalizedSelections[normalizedHeader]) {
      columns.push({
        header: normalizedHeader,
        columnIndex: col
      });
    }
  }

  return columns;
}

function normalizeSensorId(sensorId) {
  var text = String(sensorId || '').trim();
  var match = text.match(/^s0*(\d+)$/i);
  if (match) {
    return 's' + Number(match[1]);
  }
  return text.toLowerCase();
}

function getDateRange(startDateStr, endDateStr) {
  var start = parseDateOnly(startDateStr);
  var end = parseDateOnly(endDateStr || startDateStr);

  if (!start && !end) {
    return null;
  }

  if (!start) start = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0, 0);
  if (!end) end = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999);

  start = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
  end = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);

  return { start: start, end: end };
}

function parseDateOnly(value) {
  var text = String(value || '').trim();
  var match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function parseTimestamp(value) {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  var text = String(value || '').trim();
  if (!text) return null;

  var match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4] || 0),
      Number(match[5] || 0),
      Number(match[6] || 0),
      0
    );
  }

  var parsed = new Date(text);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function isWithinRange(dateValue, range) {
  if (!range) return true;
  var time = dateValue.getTime();
  return time >= range.start.getTime() && time <= range.end.getTime();
}

function formatTime(value) {
  var dateValue = parseTimestamp(value);
  if (!dateValue) return '--:--';
  return Utilities.formatDate(dateValue, Session.getScriptTimeZone(), 'HH:mm');
}

function formatTimestamp(value) {
  var dateValue = parseTimestamp(value);
  if (!dateValue) return String(value || '');
  return Utilities.formatDate(dateValue, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}

function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  var numberValue = Number(value);
  return isFinite(numberValue) ? numberValue : null;
}

function sum(values) {
  var total = 0;
  for (var i = 0; i < values.length; i++) {
    total += Number(values[i] || 0);
  }
  return total;
}

function round1(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}
