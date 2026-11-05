/**
 * أدوات مساعدة للتعامل مع جوجل شيت.
 */

function ss_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('لم يتم ربط ملف جوجل شيت. شغّل الدالة setupApp من محرر السكريبت.');
  return ss;
}

function sheet_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('الشيت غير موجود: ' + name + ' — شغّل الدالة setupApp أولاً.');
  return sh;
}

function headers_(sh) {
  var lastCol = sh.getLastColumn();
  if (lastCol < 1) return [];
  return sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
}

/** يقرأ الشيت كمصفوفة كائنات، مع رقم الصف الفعلي في _row */
function readTable_(name) {
  var sh = sheet_(name);
  var values = sh.getDataRange().getValues();
  var headers = (values.shift() || []).map(String);
  var out = [];
  for (var i = 0; i < values.length; i++) {
    var r = values[i];
    var empty = true;
    var o = { _row: i + 2 };
    for (var j = 0; j < headers.length; j++) {
      o[headers[j]] = r[j];
      if (r[j] !== '' && r[j] !== null) empty = false;
    }
    if (!empty) out.push(o);
  }
  return out;
}

/** منع حقن الصيغ في الخلايا */
function safeText_(v) {
  var s = String(v == null ? '' : v).trim();
  if (/^[=+@]/.test(s)) s = "'" + s;
  return s.substring(0, 1000);
}

function formatFor_(v) {
  if (v instanceof Date) {
    return (v.getHours() || v.getMinutes() || v.getSeconds()) ? 'yyyy-mm-dd hh:mm' : 'yyyy-mm-dd';
  }
  if (typeof v === 'string') return '@';
  if (typeof v === 'number') return '#,##0.######';
  return 'General';
}

/** يكتب صفاً كاملاً (جديداً أو موجوداً) مع ضبط تنسيق كل خلية */
function writeRow_(sh, rowIndex, headers, obj, existing) {
  var row = headers.map(function (h) {
    if (Object.prototype.hasOwnProperty.call(obj, h)) return obj[h] === undefined || obj[h] === null ? '' : obj[h];
    return existing ? existing[h] : '';
  });
  var rng = sh.getRange(rowIndex, 1, 1, headers.length);
  rng.setNumberFormats([row.map(formatFor_)]);
  rng.setValues([row]);
}

function appendObj_(name, obj) {
  var sh = sheet_(name);
  var headers = headers_(sh);
  var r = sh.getLastRow() + 1;
  if (r > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 50);
  writeRow_(sh, r, headers, obj, null);
  return r;
}

function updateObj_(name, existing, obj) {
  var sh = sheet_(name);
  writeRow_(sh, existing._row, headers_(sh), obj, existing);
}

/** حذف صفوف مع تجميع الصفوف المتتالية في عملية واحدة */
function deleteRows_(name, rowIndexes) {
  if (!rowIndexes.length) return;
  var sh = sheet_(name);
  var rows = rowIndexes.slice().sort(function (a, b) { return b - a; });
  var start = rows[0], count = 1;
  for (var i = 1; i <= rows.length; i++) {
    if (i < rows.length && rows[i] === start - 1) { start = rows[i]; count++; continue; }
    sh.deleteRows(start, count);
    if (i < rows.length) { start = rows[i]; count = 1; }
  }
}

/** إضافة عدة صفوف دفعة واحدة */
function appendObjs_(name, objs) {
  if (!objs.length) return;
  var sh = sheet_(name);
  var headers = headers_(sh);
  var r = sh.getLastRow() + 1;
  var need = r + objs.length - 1 - sh.getMaxRows();
  if (need > 0) sh.insertRowsAfter(sh.getMaxRows(), need + 50);
  var values = objs.map(function (o) { return headers.map(function (h) { return o[h] === undefined || o[h] === null ? '' : o[h]; }); });
  var rng = sh.getRange(r, 1, values.length, headers.length);
  rng.setNumberFormats(values.map(function (row) { return row.map(formatFor_); }));
  rng.setValues(values);
}

function nextId_(rows, key) {
  var max = 0;
  rows.forEach(function (r) { var n = Number(r[key]); if (n > max) max = n; });
  return max + 1;
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('النظام مشغول حالياً، حاول مرة أخرى.');
  try { return fn(); } finally { lock.releaseLock(); }
}

function isTrue_(v) {
  return v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1';
}

function tz_() {
  return Session.getScriptTimeZone() || 'Asia/Kuwait';
}

/** تحويل قيمة الخلية لقيمة يمكن إرسالها للواجهة (التواريخ كنص) */
function toClient_(v, type) {
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return '';
    return Utilities.formatDate(v, tz_(), type === 'date' ? 'yyyy-MM-dd' : "yyyy-MM-dd HH:mm");
  }
  if (type === 'checkbox') return isTrue_(v);
  return v === null || v === undefined ? '' : v;
}

function serialize_(cfg, rec) {
  var o = {};
  cfg.fields.forEach(function (f) { o[f.name] = toClient_(rec[f.name], f.type); });
  return o;
}

/** تحويل قيمة قادمة من الواجهة حسب نوع الحقل */
function normalize_(f, v) {
  switch (f.type) {
    case 'checkbox':
      return isTrue_(v);
    case 'number':
      if (v === '' || v === null || v === undefined) return '';
      var n = Number(v);
      if (isNaN(n)) throw new Error('قيمة رقمية غير صحيحة في الحقل: ' + f.label);
      return n;
    case 'date':
      if (!v) return '';
      var m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!m) throw new Error('تاريخ غير صحيح في الحقل: ' + f.label);
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    case 'email':
      var e = String(v || '').trim().toLowerCase();
      if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error('البريد الإلكتروني غير صحيح.');
      return e;
    case 'select':
      var s = safeText_(v);
      if (s && f.source && f.source['static']) {
        var ok = f.source['static'].some(function (o) { return o.v === s; });
        if (!ok) throw new Error('قيمة غير مسموحة في الحقل: ' + f.label);
      }
      return s;
    default:
      return safeText_(v);
  }
}

function audit_(user, action, entity, key, details) {
  try {
    var sh = sheet_('AuditLog');
    var last = sh.getLastRow();
    var id = last > 1 ? Number(sh.getRange(last, 1).getValue()) + 1 : 1;
    appendObj_('AuditLog', {
      LogId: id || last, Timestamp: new Date(), Username: user ? user.Username : '',
      Action: action, Entity: entity, RecordKey: String(key == null ? '' : key), Details: safeText_(details || '')
    });
  } catch (e) { console.error(e); }
}
