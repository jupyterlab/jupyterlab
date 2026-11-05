/**
 * تهيئة النظام — شغّل الدالة setupApp مرة واحدة من محرر السكريبت.
 * تنشئ الشيتات المطلوبة، رؤوس الأعمدة، التنسيق، المستخدم الافتراضي وبيانات القوائم الأولية.
 * آمنة للتشغيل أكثر من مرة: لا تحذف بيانات موجودة.
 */

var DEFAULT_ADMIN = { username: 'admin', password: 'Admin@12345', email: 'admin@example.org', fullName: 'مدير النظام' };

function onOpen() {
  SpreadsheetApp.getUi().createMenu('⚙️ نظام المشروعات')
    .addItem('تهيئة / تحديث الشيتات', 'setupApp')
    .addItem('رابط التطبيق', 'showAppUrl_')
    .addToUi();
}

function setupApp() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('افتح السكريبت من داخل ملف جوجل شيت (Extensions > Apps Script) ثم شغّل setupApp.');
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
  pepper_();

  // شيتات المرحلة الأولى
  ensureSheet_(ss, 'Users', USER_COLUMNS, USER_COLUMNS.map(function (c) {
    var f = ENTITIES.users.fields.filter(function (x) { return x.name === c; })[0];
    return f ? f.label : ({ PasswordHash: 'كلمة المرور (مشفرة)', Salt: 'ملح التشفير', Permissions: 'الصلاحيات JSON' })[c] || c;
  }));
  ['accounts', 'projects', 'lookups', 'audit'].forEach(function (k) {
    var cfg = ENTITIES[k];
    ensureSheet_(ss, cfg.sheet,
      cfg.fields.map(function (f) { return f.name; }),
      cfg.fields.map(function (f) { return f.label; }),
      cfg.fields.filter(function (f) { return f.text; }).map(function (f) { return f.name; }));
  });

  // شيتات المرحلة الثانية (الهيكل فقط)
  Object.keys(PHASE2_SHEETS).forEach(function (name) {
    var d = PHASE2_SHEETS[name];
    ensureSheet_(ss, name, d.columns, d.labels, ['DocumentNumber', 'AccountId', 'ProjectId']);
  });

  seedAdmin_();
  seedLookups_();

  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('ورقة1');
  if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);

  var msg = 'تمت التهيئة بنجاح.\nالمستخدم: ' + DEFAULT_ADMIN.username + '\nكلمة المرور المؤقتة: ' + DEFAULT_ADMIN.password +
    '\n(سيُطلب تغييرها عند أول دخول)\n\nالخطوة التالية: Deploy > New deployment > Web app';
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { console.log(msg); }
}

function ensureSheet_(ss, name, columns, labels, textCols) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  var existing = sh.getLastColumn() ? headers_(sh) : [];
  // إضافة الأعمدة الناقصة فقط (لا نحذف أو نعيد ترتيب)
  var missing = columns.filter(function (c) { return existing.indexOf(c) < 0; });
  if (missing.length) {
    var start = existing.filter(String).length + 1;
    sh.getRange(1, start, 1, missing.length).setValues([missing]);
  }
  var headers = headers_(sh);
  headers.forEach(function (h, i) {
    var idx = columns.indexOf(h);
    if (idx >= 0 && labels && labels[idx]) sh.getRange(1, i + 1).setNote(labels[idx]);
  });
  var head = sh.getRange(1, 1, 1, headers.length);
  head.setFontWeight('bold').setBackground('#002050').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.setRightToLeft(true);
  (textCols || []).forEach(function (c) {
    var i = headers.indexOf(c);
    if (i >= 0 && sh.getMaxRows() > 1) sh.getRange(2, i + 1, sh.getMaxRows() - 1, 1).setNumberFormat('@');
  });
  if (name === 'Users') {
    ['PasswordHash', 'Salt', 'Permissions'].forEach(function (c) {
      var i = headers.indexOf(c);
      if (i >= 0) sh.hideColumns(i + 1);
    });
    protectSheet_(sh);
  }
  return sh;
}

function protectSheet_(sh) {
  try {
    var p = sh.protect().setDescription('بيانات المستخدمين — تُعدّل من التطبيق فقط');
    p.removeEditors(p.getEditors());
    if (p.canDomainEdit()) p.setDomainEdit(false);
  } catch (e) { console.log(e); }
}

function seedAdmin_() {
  var users = readTable_('Users');
  if (users.length) return;
  var salt = newSalt_();
  appendObj_('Users', {
    UserId: 1, Username: DEFAULT_ADMIN.username, FullName: DEFAULT_ADMIN.fullName, Email: DEFAULT_ADMIN.email,
    PasswordHash: hashPassword_(DEFAULT_ADMIN.password, salt), Salt: salt, IsActive: true, IsAdmin: true,
    MustChangePassword: true, Permissions: '{}', CreatedAt: new Date(), CreatedBy: 'system'
  });
}

function seedLookups_() {
  if (readTable_('Lookups').length) return;
  var data = [
    ['Bank', 'NBK', 'بنك الكويت الوطني'], ['Bank', 'KFH', 'بيت التمويل الكويتي'], ['Bank', 'BOUB', 'بنك BOA جيبوتي'],
    ['JournalType', 'TRF', 'يومية التحويلات'], ['JournalType', 'GEN', 'اليومية العامة'],
    ['ProjectGroup', 'MSQ', 'بناء المساجد'], ['ProjectGroup', 'WEL', 'حفر الآبار'],
    ['ProjectGroup', 'ORP', 'كفالة الأيتام'], ['ProjectGroup', 'REL', 'الإغاثة والسلال الغذائية'],
    ['ProjectGroup', 'EDU', 'التعليم'],
    ['ProjectType', 'NEW', 'إنشاء جديد'], ['ProjectType', 'MNT', 'صيانة وترميم'],
    ['ProjectType', 'SPN', 'كفالة شهرية'], ['ProjectType', 'DST', 'توزيع موسمي']
  ];
  var now = new Date();
  data.forEach(function (d, i) {
    appendObj_('Lookups', { LookupId: i + 1, LookupType: d[0], Code: d[1], Name: d[2], IsActive: true, CreatedAt: now, CreatedBy: 'system' });
  });
}

function showAppUrl_() {
  var url = ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().alert(url ? 'رابط التطبيق:\n' + url : 'لم يتم النشر بعد. استخدم Deploy > New deployment > Web app');
}
