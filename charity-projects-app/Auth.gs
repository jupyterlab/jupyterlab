/**
 * المصادقة: تشفير كلمات المرور (SHA-256 + Salt + Pepper مع تكرار)، الجلسات، والصلاحيات.
 */

function pepper_() {
  var props = PropertiesService.getScriptProperties();
  var p = props.getProperty('PEPPER');
  if (!p) {
    p = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('PEPPER', p);
  }
  return p;
}

function newSalt_() {
  return Utilities.getUuid().replace(/-/g, '');
}

function hashPassword_(password, salt) {
  var pep = pepper_();
  var h = salt + '|' + password + '|' + pep;
  for (var i = 0; i < APP.hashIterations; i++) {
    var bytes = Utilities.computeHmacSha256Signature(h, pep + salt);
    h = Utilities.base64Encode(bytes);
  }
  return h;
}

/** مقارنة ثابتة الزمن */
function safeEquals_(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  var r = 0;
  for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function validatePassword_(pw) {
  pw = String(pw || '');
  if (pw.length < 8) throw new Error('كلمة المرور يجب ألا تقل عن 8 أحرف.');
  if (!/[A-Za-z؀-ۿ]/.test(pw) || !/\d/.test(pw)) throw new Error('كلمة المرور يجب أن تحتوي على حروف وأرقام.');
  return pw;
}

/* ---------------- الجلسات ---------------- */

function createSession_(user) {
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put('S_' + token, String(user.UserId), APP.sessionSeconds);
  return token;
}

function destroySession_(token) {
  if (token) CacheService.getScriptCache().remove('S_' + token);
}

function findUserById_(id) {
  var users = readTable_('Users');
  for (var i = 0; i < users.length; i++) if (String(users[i].UserId) === String(id)) return users[i];
  return null;
}

/** يتحقق من الجلسة ويعيد المستخدم (مع تمديد الجلسة) */
function requireUser_(token) {
  if (!token) throw new Error('AUTH: يرجى تسجيل الدخول.');
  var cache = CacheService.getScriptCache();
  var id = cache.get('S_' + token);
  if (!id) throw new Error('AUTH: انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى.');
  var u = findUserById_(id);
  if (!u || !isTrue_(u.IsActive)) {
    destroySession_(token);
    throw new Error('AUTH: الحساب غير موجود أو موقوف.');
  }
  cache.put('S_' + token, String(id), APP.sessionSeconds);
  return u;
}

/* ---------------- الصلاحيات ---------------- */

function allPerms_() {
  var p = {};
  PAGES.forEach(function (pg) { p[pg.key] = pg.actions.slice(); });
  return p;
}

function userPerms_(u) {
  if (isTrue_(u.IsAdmin)) return allPerms_();
  var raw = {};
  try { raw = JSON.parse(u.Permissions || '{}') || {}; } catch (e) { raw = {}; }
  return sanitizePerms_(raw);
}

/** تنظيف الصلاحيات: يقبل فقط صفحات وإجراءات معرّفة، ويضيف "عرض" تلقائياً عند منح أي إجراء */
function sanitizePerms_(raw) {
  var out = {};
  PAGES.forEach(function (pg) {
    var acts = (raw && raw[pg.key]) || [];
    if (!Array.isArray(acts)) return;
    var allowed = pg.actions.filter(function (a) { return acts.indexOf(a) >= 0; });
    if (allowed.length && allowed.indexOf('view') < 0) allowed.unshift('view');
    if (allowed.length) out[pg.key] = allowed;
  });
  return out;
}

function can_(u, page, action) {
  var p = userPerms_(u);
  return (p[page] || []).indexOf(action) >= 0;
}

function requirePerm_(u, page, action) {
  if (!can_(u, page, action)) {
    var a = ACTIONS.filter(function (x) { return x.key === action; })[0];
    var pg = PAGES.filter(function (x) { return x.key === page; })[0];
    throw new Error('ليس لديك صلاحية "' + (a ? a.label : action) + '" في صفحة "' + (pg ? pg.title : page) + '".');
  }
}
