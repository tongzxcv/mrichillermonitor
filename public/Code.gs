/**
 * =====================================================
 *  MRI Chiller Monitor — Google Apps Script Backend
 * =====================================================
 *
 *  วิธีใช้:
 *  1. เปิด Google Sheets ใหม่
 *  2. ไปที่ Extensions > Apps Script
 *  3. วาง code นี้ลงใน Code.gs
 *  4. สร้าง Sheet ชื่อ "SensorData" ที่มี header:
 *     | timestamp | s1 | s2 | s3 | s4 | s5 | s6 | s7 | s8 | s9 | s10 |
 *  5. สร้าง Sheet ชื่อ "Config" ที่มี header:
 *     | sensorId | name | threshold | color |
 *  6. Deploy > New deployment > Web app
 *     - Execute as: Me
 *     - Who has access: Anyone
 *  7. คัดลอก URL มาใส่ใน React app (.env หรือ Settings)
 */

// ====== CORS + Routing ======

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'latest';

  var result;
  switch (action) {
    case 'latest':
      result = getLatestData();
      break;
    case 'history':
      var date = (e.parameter && e.parameter.date) || '';
      result = getHistoryData(date);
      break;
    case 'config':
      result = getConfig();
      break;
    default:
      result = { error: 'Unknown action: ' + action };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action || '';

    var result;
    switch (action) {
      case 'log':
        result = logSensorData(body.data);
        break;
      case 'updateConfig':
        result = updateConfig(body.config);
        break;
      default:
        result = { error: 'Unknown POST action' };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ====== Data Functions ======

function getLatestData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('SensorData');
  if (!sheet) return { error: 'Sheet "SensorData" not found' };

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return { sensors: [], timestamp: null };

  var headers = data[0]; // [timestamp, s1, s2, ..., s10]
  var historyRows = data.slice(Math.max(1, data.length - 20)); // last 20 rows

  var config = getConfigMap();

  var sensors = [];
  for (var col = 1; col < headers.length; col++) {
    var sensorId = headers[col];
    var cfg = config[sensorId] || { name: sensorId, threshold: 14, color: '#888' };

    var values = [];
    var history = [];
    for (var row = 0; row < historyRows.length; row++) {
      var val = Number(historyRows[row][col]);
      values.push(val);
      var t = historyRows[row][0];
      var timeStr = (t instanceof Date)
        ? Utilities.formatDate(t, Session.getScriptTimeZone(), 'HH:mm')
        : String(t);
      history.push({ time: timeStr, value: val });
    }

    var current = values[values.length - 1];
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var sum = 0;
    for (var v = 0; v < values.length; v++) sum += values[v];
    var avg = Math.round((sum / values.length) * 10) / 10;

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

  var lastRow = data[data.length - 1];
  var timestamp = lastRow[0] instanceof Date
    ? lastRow[0].toISOString()
    : String(lastRow[0]);

  return { sensors: sensors, timestamp: timestamp };
}

function getHistoryData(dateStr) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('SensorData');
  if (!sheet) return { error: 'Sheet "SensorData" not found' };

  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var targetDate = dateStr ? new Date(dateStr) : new Date();
  var targetDay = Utilities.formatDate(targetDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');

  var filtered = [];
  for (var i = 1; i < data.length; i++) {
    var rowDate = data[i][0];
    if (rowDate instanceof Date) {
      var rowDay = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      if (rowDay === targetDay) {
        var point = {
          time: Utilities.formatDate(rowDate, Session.getScriptTimeZone(), 'HH:mm')
        };
        for (var col = 1; col < headers.length; col++) {
          point[headers[col]] = Number(data[i][col]);
        }
        filtered.push(point);
      }
    }
  }

  return { date: targetDay, data: filtered };
}

function getConfig() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Config');
  if (!sheet) return { error: 'Sheet "Config" not found' };

  var data = sheet.getDataRange().getValues();
  var configs = [];
  for (var i = 1; i < data.length; i++) {
    configs.push({
      id: data[i][0],
      name: data[i][1],
      threshold: Number(data[i][2]),
      color: data[i][3]
    });
  }
  return { configs: configs };
}

function getConfigMap() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Config');
  if (!sheet) return {};

  var data = sheet.getDataRange().getValues();
  var map = {};
  for (var i = 1; i < data.length; i++) {
    map[data[i][0]] = {
      name: data[i][1],
      threshold: Number(data[i][2]),
      color: data[i][3]
    };
  }
  return map;
}

// ====== Write Functions ======

function logSensorData(sensorData) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('SensorData');
  if (!sheet) return { error: 'Sheet "SensorData" not found' };

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = [new Date()];
  for (var i = 1; i < headers.length; i++) {
    row.push(sensorData[headers[i]] || 0);
  }
  sheet.appendRow(row);
  return { success: true, row: sheet.getLastRow() };
}

function updateConfig(configArr) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Config');
  if (!sheet) return { error: 'Sheet "Config" not found' };

  // Clear and rewrite
  sheet.getRange(2, 1, sheet.getLastRow(), 4).clearContent();
  for (var i = 0; i < configArr.length; i++) {
    var c = configArr[i];
    sheet.getRange(i + 2, 1, 1, 4).setValues([[c.id, c.name, c.threshold, c.color]]);
  }
  return { success: true };
}
