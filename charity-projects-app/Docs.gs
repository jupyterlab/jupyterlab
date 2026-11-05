/**
 * المرحلة الثانية: السندات ذات الرأس والسطور (سند التحويل — سند الصرف)
 * الحفظ كمسودة، الترحيل، إلغاء الترحيل، الحذف، وأرصدة المشروعات.
 */

function docCfg_(entity) {
  var c = entityCfg_(entity);
  if (!c.doc) throw new Error('هذه الصفحة ليست سنداً.');
  return c;
}

/** يحقن دوال الحساب المشتركة في الواجهة */
function sharedJs_() {
  return calcDoc_.toString();
}

function round_(n, d) {
  var p = Math.pow(10, d); var x = Number(n) || 0;
  return Math.round(x * p + (x >= 0 ? 1e-9 : -1e-9)) / p;
}

function readLines_(cfg, key) {
  return readTable_(cfg.lines.sheet)
    .filter(function (l) { return String(l[cfg.lines.fk]) === String(key); })
    .sort(function (a, b) { return Number(a.LineId) - Number(b.LineId); });
}

function findDoc_(cfg, key) {
  return readTable_(cfg.sheet).filter(function (r) { return String(r[cfg.key]) === String(key); })[0] || null;
}

function docOut_(entity, cfg, key) {
  var h = findDoc_(cfg, key);
  if (!h) throw new Error('السند غير موجود، ربما تم حذفه.');
  var out = {
    header: serialize_(cfg, h),
    lines: readLines_(cfg, key).map(function (l) { return serialize_(cfg.lines, l); })
  };
  if (entity === 'payments' && h.ProjectId) out.balance = projectBalance_(h.ProjectId, key);
  return out;
}

/** تنظيف الحقول القادمة من الواجهة (يتجاهل حقول النظام والمحسوبة والمشتقة) */
function cleanFields_(fields, src, prefix) {
  var o = {};
  src = src || {};
  fields.forEach(function (f) {
    if (f.system || f.derive || f.calc || f.readonly) return;
    var v = src[f.name];
    if ((v === undefined || v === '') && f['default'] !== undefined) v = f['default'];
    v = normalize_(f, v);
    if (f.required && (v === '' || v === null)) throw new Error(prefix + 'الحقل مطلوب: ' + f.label);
    if (f.positive && v !== '' && !(v > 0)) throw new Error(prefix + 'يجب أن يكون "' + f.label + '" أكبر من صفر.');
    o[f.name] = v;
  });
  return o;
}

function tableCache_() {
  var cache = {};
  return function (entity) {
    if (!cache[entity]) cache[entity] = readTable_(ENTITIES[entity].sheet);
    return cache[entity];
  };
}

function validateRefsAndDerive_(fields, o, table, prefix) {
  fields.forEach(function (f) {
    if (!f.source || !f.source.entity || o[f.name] === '' || o[f.name] === undefined) return;
    var t = ENTITIES[f.source.entity];
    var found = table(f.source.entity).some(function (r) { return String(r[t.key]) === String(o[f.name]); });
    if (!found) throw new Error(prefix + 'القيمة "' + o[f.name] + '" غير موجودة في ' + t.plural + '.');
  });
  fields.forEach(function (f) {
    if (!f.derive) return;
    var t = ENTITIES[f.derive.entity];
    var src = table(f.derive.entity).filter(function (r) { return String(r[t.key]) === String(o[f.derive.from]); })[0];
    o[f.name] = src ? src[f.derive.field] : '';
    if (f.required && (o[f.name] === '' || o[f.name] === null)) {
      throw new Error(prefix + 'لا يوجد "' + f.label + '" مرتبط بالقيمة المختارة. اربط المشروع بحساب أولاً.');
    }
  });
}

function nextDocNo_(rows, cfg) {
  var prefix = cfg.prefix + '-' + new Date().getFullYear() + '-';
  var max = 0;
  rows.forEach(function (r) {
    var k = String(r[cfg.key]);
    if (k.indexOf(prefix) === 0) { var n = parseInt(k.substring(prefix.length), 10); if (n > max) max = n; }
  });
  return prefix + ('0000' + (max + 1)).slice(-4);
}

function hasInput_(fields, l) {
  return fields.some(function (f) {
    if (f.calc || f.derive || f['default'] !== undefined) return false;
    var v = l && l[f.name];
    return v !== '' && v !== null && v !== undefined;
  });
}

/* ================= API ================= */

function apiGetDoc(token, entity, key) {
  return run_(function () {
    var u = requireUser_(token);
    var cfg = docCfg_(entity);
    requirePerm_(u, cfg.page, 'view');
    return docOut_(entity, cfg, key);
  });
}

function apiSaveDoc(token, entity, header, lines, mode, origKey) {
  return run_(function () {
    var u = requireUser_(token);
    var cfg = docCfg_(entity);
    if (mode !== 'add' && mode !== 'edit') throw new Error('إجراء غير صحيح.');
    requirePerm_(u, cfg.page, mode);
    return withLock_(function () {
      var rows = readTable_(cfg.sheet);
      var existing = null;
      if (mode === 'edit') {
        existing = rows.filter(function (r) { return String(r[cfg.key]) === String(origKey); })[0];
        if (!existing) throw new Error('السند غير موجود، ربما تم حذفه.');
        if (existing.Status === 'Posted') throw new Error('السند مرحّل ولا يمكن تعديله.');
      }
      var table = tableCache_();
      var h = cleanFields_(cfg.fields, header, '');
      validateRefsAndDerive_(cfg.fields, h, table, '');

      var src = (lines || []).filter(function (l) { return hasInput_(cfg.lines.fields, l); });
      if (src.length > 300) throw new Error('الحد الأقصى 300 سطر في السند الواحد.');
      var cl = src.map(function (l, i) {
        var p = 'السطر ' + (i + 1) + ': ';
        var o = cleanFields_(cfg.lines.fields, l, p);
        validateRefsAndDerive_(cfg.lines.fields, o, table, p);
        return o;
      });
      calcDoc_(entity, h, cl);
      delete h._balanced; delete h._diff;

      var key = existing ? existing[cfg.key] : nextDocNo_(rows, cfg);
      h[cfg.key] = key;
      cl.forEach(function (o) { o[cfg.lines.fk] = key; });
      var now = new Date();
      if (existing) {
        h.ModifiedAt = now; h.ModifiedBy = u.Username;
        updateObj_(cfg.sheet, existing, h);
      } else {
        h.Status = 'Draft'; h.CreatedAt = now; h.CreatedBy = u.Username;
        appendObj_(cfg.sheet, h);
      }
      replaceLines_(cfg, key, cl);
      audit_(u, existing ? 'تعديل' : 'إضافة', entity, key, cl.length + ' سطر');
      return docOut_(entity, cfg, key);
    });
  });
}

function replaceLines_(cfg, key, newLines) {
  var old = readTable_(cfg.lines.sheet).filter(function (l) { return String(l[cfg.lines.fk]) === String(key); });
  deleteRows_(cfg.lines.sheet, old.map(function (l) { return l._row; }));
  appendObjs_(cfg.lines.sheet, newLines);
}

/** الترحيل (unpost=true لإلغاء الترحيل — لمدير النظام فقط) */
function apiPostDoc(token, entity, key, unpost) {
  return run_(function () {
    var u = requireUser_(token);
    var cfg = docCfg_(entity);
    requirePerm_(u, cfg.page, 'post');
    return withLock_(function () {
      var h = findDoc_(cfg, key);
      if (!h) throw new Error('السند غير موجود.');
      if (unpost) {
        if (!isTrue_(u.IsAdmin)) throw new Error('إلغاء الترحيل متاح لمدير النظام فقط.');
        if (h.Status !== 'Posted') throw new Error('السند غير مرحّل.');
        updateObj_(cfg.sheet, h, { Status: 'Draft', PostedAt: '', PostedBy: '' });
        audit_(u, 'إلغاء ترحيل', entity, key);
      } else {
        if (h.Status === 'Posted') throw new Error('السند مرحّل مسبقاً.');
        var lines = readLines_(cfg, key);
        if (!lines.length) throw new Error('لا يمكن ترحيل سند بدون سطور.');
        var check = {};
        Object.keys(h).forEach(function (k) { check[k] = h[k]; });
        calcDoc_(entity, check, lines.map(function (l) { var c = {}; Object.keys(l).forEach(function (k) { c[k] = l[k]; }); return c; }));
        if (entity === 'receipts' && !check._balanced) {
          throw new Error('لا يمكن الترحيل: إجمالي السطور لا يساوي قيمة التحويل. الفرق — دينار: ' + check._diff.KWD +
            ' | دولار: ' + check._diff.USD + ' | فرنك: ' + check._diff.DJF);
        }
        updateObj_(cfg.sheet, h, { Status: 'Posted', PostedAt: new Date(), PostedBy: u.Username });
        audit_(u, 'ترحيل', entity, key);
      }
      return docOut_(entity, cfg, key);
    });
  });
}

/** يُستدعى من apiDelete للسندات */
function deleteDocs_(u, entity, cfg, targets) {
  targets.forEach(function (t) {
    if (t.Status === 'Posted') throw new Error('لا يمكن حذف السند المرحّل "' + t[cfg.key] + '". ألغِ الترحيل أولاً.');
  });
  var keys = targets.map(function (t) { return String(t[cfg.key]); });
  deleteRows_(cfg.sheet, targets.map(function (t) { return t._row; }));
  var lines = readTable_(cfg.lines.sheet).filter(function (l) { return keys.indexOf(String(l[cfg.lines.fk])) >= 0; });
  deleteRows_(cfg.lines.sheet, lines.map(function (l) { return l._row; }));
  targets.forEach(function (t) { audit_(u, 'حذف', entity, t[cfg.key]); });
  return targets.length;
}

/* ================= الأرصدة ================= */

/** أرصدة كل المشروعات من السندات المرحّلة فقط */
function projectBalances_(excludeVoucher) {
  var res = {};
  function b(p) {
    p = String(p);
    return res[p] || (res[p] = { inKWD: 0, inUSD: 0, inDJF: 0, outKWD: 0, outUSD: 0, outDJF: 0 });
  }
  var posted = {};
  readTable_('Receipts').forEach(function (h) { if (h.Status === 'Posted') posted[String(h.DocumentNumber)] = true; });
  readTable_('ReceiptLines').forEach(function (l) {
    if (!posted[String(l.DocumentNumber)]) return;
    var x = b(l.ProjectId);
    x.inKWD += Number(l.AmountKWD) || 0; x.inUSD += Number(l.AmountUSD) || 0; x.inDJF += Number(l.AmountDJF) || 0;
  });
  var pv = {};
  readTable_('Payments').forEach(function (h) {
    if (h.Status === 'Posted' && String(h.VoucherNo) !== String(excludeVoucher || '')) pv[String(h.VoucherNo)] = h.ProjectId;
  });
  readTable_('PaymentLines').forEach(function (l) {
    var p = pv[String(l.VoucherNo)];
    if (p === undefined) return;
    var k = 'out' + l.Currency;
    var x = b(p);
    if (x[k] !== undefined) x[k] += Number(l.Amount) || 0;
  });
  // التحويل الواحد مُعبَّر عنه بثلاث عملات؛ لذلك يُحوَّل كل صرف إلى العملات الثلاث
  // بمتوسط سعر التحويلات الواردة للمشروع حتى تبقى الأرصدة متسقة.
  Object.keys(res).forEach(function (p) {
    var x = res[p];
    x.rawOutKWD = x.outKWD; x.rawOutUSD = x.outUSD; x.rawOutDJF = x.outDJF;
    if (x.inKWD > 0) {
      x.rUSD = x.inUSD / x.inKWD; x.rDJF = x.inDJF / x.inKWD;
      var eqKWD = x.outKWD + (x.rUSD ? x.outUSD / x.rUSD : 0) + (x.rDJF ? x.outDJF / x.rDJF : 0);
      x.outKWD = eqKWD; x.outUSD = eqKWD * x.rUSD; x.outDJF = eqKWD * x.rDJF;
    } else { x.rUSD = 0; x.rDJF = 0; }
    [['KWD', 3], ['USD', 2], ['DJF', 0]].forEach(function (c) {
      x['in' + c[0]] = round_(x['in' + c[0]], c[1]);
      x['out' + c[0]] = round_(x['out' + c[0]], c[1]);
      x['rawOut' + c[0]] = round_(x['rawOut' + c[0]], c[1]);
      x['bal' + c[0]] = round_(x['in' + c[0]] - x['out' + c[0]], c[1]);
    });
  });
  return res;
}

function emptyBalance_() {
  return { inKWD: 0, inUSD: 0, inDJF: 0, outKWD: 0, outUSD: 0, outDJF: 0, balKWD: 0, balUSD: 0, balDJF: 0, rUSD: 0, rDJF: 0 };
}

function projectBalance_(projectId, excludeVoucher) {
  return projectBalances_(excludeVoucher)[String(projectId)] || emptyBalance_();
}

function apiProjectBalance(token, projectId, excludeVoucher) {
  return run_(function () {
    var u = requireUser_(token);
    if (!can_(u, 'payments', 'view') && !can_(u, 'balances', 'view')) requirePerm_(u, 'balances', 'view');
    return projectBalance_(projectId, excludeVoucher);
  });
}

function apiBalances(token) {
  return run_(function () {
    var u = requireUser_(token);
    requirePerm_(u, 'balances', 'view');
    var bal = projectBalances_();
    return readTable_('Projects').map(function (p) {
      var b = bal[String(p.ProjectId)] || emptyBalance_();
      b.ProjectId = String(p.ProjectId); b.Description = p.Description; b.ProjectGroup = p.ProjectGroup;
      return b;
    });
  });
}
