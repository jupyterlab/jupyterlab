/**
 * واجهة الخادم (API) التي تستدعيها الواجهة عبر google.script.run
 * كل دالة تعيد {ok, data} أو {ok:false, error, auth}
 */

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(APP.name)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

function run_(fn) {
  try {
    return { ok: true, data: fn() };
  } catch (e) {
    var msg = String((e && e.message) || e);
    var auth = msg.indexOf('AUTH:') === 0;
    return { ok: false, error: msg.replace(/^AUTH:\s*/, ''), auth: auth };
  }
}

function entityCfg_(name) {
  var cfg = ENTITIES[name];
  if (!cfg) throw new Error('صفحة غير معروفة: ' + name);
  return cfg;
}

/* ================= الدخول والخروج ================= */

function apiLogin(username, password) {
  return run_(function () {
    username = String(username || '').trim().toLowerCase();
    if (!username || !password) throw new Error('أدخل اسم المستخدم وكلمة المرور.');
    var cache = CacheService.getScriptCache();
    var failKey = 'F_' + username;
    var fails = Number(cache.get(failKey) || 0);
    if (fails >= APP.maxLoginAttempts) {
      throw new Error('تم إيقاف الدخول مؤقتاً بسبب محاولات خاطئة متكررة. حاول بعد ' + APP.lockMinutes + ' دقيقة.');
    }
    var users = readTable_('Users');
    var u = users.filter(function (x) { return String(x.Username).toLowerCase() === username; })[0];
    var ok = u && safeEquals_(hashPassword_(String(password), String(u.Salt)), String(u.PasswordHash));
    if (!ok) {
      cache.put(failKey, String(fails + 1), APP.lockMinutes * 60);
      audit_({ Username: username }, 'دخول فاشل', 'auth', '');
      throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة.');
    }
    if (!isTrue_(u.IsActive)) throw new Error('هذا الحساب موقوف. تواصل مع مدير النظام.');
    cache.remove(failKey);
    updateObj_('Users', u, { LastLogin: new Date() });
    audit_(u, 'تسجيل دخول', 'auth', u.Username);
    return { token: createSession_(u) };
  });
}

function apiLogout(token) {
  return run_(function () { destroySession_(token); return true; });
}

/** بيانات بدء التشغيل: المستخدم، الصلاحيات، الصفحات، تعريف الكيانات والقوائم */
function apiBootstrap(token) {
  return run_(function () {
    var u = requireUser_(token);
    var entities = {};
    Object.keys(ENTITIES).forEach(function (k) {
      var c = ENTITIES[k];
      entities[k] = {
        name: k, page: c.page, key: c.key, autoKey: !!c.autoKey, titleField: c.titleField, singular: c.singular,
        plural: c.plural, icon: c.icon, readOnly: !!c.readOnly, custom: !!c.custom, fields: c.fields,
        doc: !!c.doc, lines: c.lines || null
      };
    });
    return {
      app: { name: APP.name, orgName: APP.orgName },
      user: {
        id: u.UserId, username: u.Username, fullName: u.FullName, email: u.Email,
        isAdmin: isTrue_(u.IsAdmin), mustChangePassword: isTrue_(u.MustChangePassword)
      },
      perms: userPerms_(u),
      pages: PAGES,
      actions: ACTIONS,
      entities: entities,
      options: buildOptions_()
    };
  });
}

function apiOptions(token) {
  return run_(function () { requireUser_(token); return buildOptions_(); });
}

/** قوائم الاختيار: الحسابات + القوائم المساعدة النشطة */
function buildOptions_() {
  var opts = {};
  opts.accounts = readTable_('ChartOfAccounts')
    .filter(function (r) { return r.IsActive === '' || isTrue_(r.IsActive); })
    .map(function (r) { return { v: String(r.AccountId), l: String(r.AccountId) + ' - ' + r.AccountName, name: r.AccountName, AccountName: r.AccountName }; });
  opts.projects = readTable_('Projects').map(function (r) {
    return { v: String(r.ProjectId), l: String(r.ProjectId) + ' - ' + r.Description, name: r.Description,
      Description: r.Description, AccountId: String(r.AccountId), AccountName: r.AccountName };
  });
  LOOKUP_TYPES.forEach(function (t) { opts['lookup_' + t.v] = []; });
  readTable_('Lookups').forEach(function (r) {
    if (!isTrue_(r.IsActive)) return;
    var k = 'lookup_' + r.LookupType;
    if (opts[k]) opts[k].push({ v: String(r.Name), l: String(r.Name) });
  });
  return opts;
}

/* ================= لوحة المعلومات ================= */

function apiDashboard(token) {
  return run_(function () {
    var u = requireUser_(token);
    var out = { cards: [], byGroup: [], recent: [] };
    if (can_(u, 'projects', 'view')) {
      var projects = readTable_('Projects');
      out.cards.push({ label: 'المشروعات', value: projects.length, page: 'projects' });
      var groups = {};
      projects.forEach(function (p) { var g = p.ProjectGroup || 'غير محدد'; groups[g] = (groups[g] || 0) + 1; });
      out.byGroup = Object.keys(groups).map(function (k) { return { label: k, value: groups[k] }; })
        .sort(function (a, b) { return b.value - a.value; });
      out.recent = projects.slice(-6).reverse().map(function (p) { return serialize_(ENTITIES.projects, p); });
    }
    [['receipts', 'Receipts', 'سندات التحويل'], ['payments', 'Payments', 'سندات الصرف']].forEach(function (d) {
      if (!can_(u, d[0], 'view')) return;
      var rows = readTable_(d[1]);
      var drafts = rows.filter(function (r) { return r.Status !== 'Posted'; }).length;
      out.cards.push({ label: d[2], value: rows.length, sub: drafts ? drafts + ' مسودة بانتظار الترحيل' : 'كلها مرحّلة', page: d[0] });
    });
    if (can_(u, 'accounts', 'view')) out.cards.push({ label: 'الحسابات', value: readTable_('ChartOfAccounts').length, page: 'accounts' });
    if (can_(u, 'lookups', 'view')) out.cards.push({ label: 'عناصر القوائم', value: readTable_('Lookups').length, page: 'lookups' });
    if (can_(u, 'users', 'view')) out.cards.push({ label: 'المستخدمون', value: readTable_('Users').length, page: 'users' });
    return out;
  });
}

/* ================= عمليات عامة على الكيانات ================= */

function apiList(token, entity) {
  return run_(function () {
    var u = requireUser_(token);
    var cfg = entityCfg_(entity);
    requirePerm_(u, cfg.page, 'view');
    var rows = readTable_(cfg.sheet);
    if (entity === 'users') {
      return rows.map(function (r) {
        var o = serialize_(cfg, r);
        o._perms = userPerms_(r);
        return o;
      });
    }
    if (entity === 'audit') rows = rows.slice(-APP.auditListLimit).reverse();
    return rows.map(function (r) { return serialize_(cfg, r); });
  });
}

function apiSave(token, entity, rec, mode, origKey) {
  return run_(function () {
    var u = requireUser_(token);
    var cfg = entityCfg_(entity);
    if (cfg.readOnly) throw new Error('هذه الصفحة للعرض فقط.');
    if (cfg.doc) throw new Error('استخدم apiSaveDoc لحفظ السندات.');
    if (mode !== 'add' && mode !== 'edit') throw new Error('إجراء غير صحيح.');
    requirePerm_(u, cfg.page, mode);
    rec = rec || {};
    return withLock_(function () {
      if (entity === 'users') return saveUser_(u, rec, mode, origKey);
      return saveGeneric_(u, entity, cfg, rec, mode, origKey);
    });
  });
}

function saveGeneric_(u, entity, cfg, rec, mode, origKey) {
  var rows = readTable_(cfg.sheet);
  var clean = {};
  cfg.fields.forEach(function (f) {
    if (f.system || f.derive) return;
    if (f.name === cfg.key && mode === 'edit') return; // المعرف لا يتغير
    var v = rec[f.name];
    if ((v === undefined || v === '') && mode === 'add' && f['default'] !== undefined) v = f['default'];
    v = normalize_(f, v);
    if (f.required && (v === '' || v === null)) throw new Error('الحقل مطلوب: ' + f.label);
    clean[f.name] = v;
  });

  var existing = null;
  var key;
  if (mode === 'add') {
    key = cfg.autoKey ? nextId_(rows, cfg.key) : String(clean[cfg.key]);
    if (cfg.autoKey) clean[cfg.key] = key;
    if (!cfg.autoKey && /\s/.test(key)) throw new Error('المعرف لا يجب أن يحتوي على مسافات.');
    if (rows.some(function (r) { return String(r[cfg.key]) === String(key); })) {
      throw new Error('المعرف "' + key + '" موجود مسبقاً.');
    }
  } else {
    existing = rows.filter(function (r) { return String(r[cfg.key]) === String(origKey); })[0];
    if (!existing) throw new Error('السجل غير موجود، ربما تم حذفه.');
    key = existing[cfg.key];
  }

  // التحقق من القيم المرتبطة بكيانات أخرى
  cfg.fields.forEach(function (f) {
    if (!f.source || !f.source.entity || clean[f.name] === '' || clean[f.name] === undefined) return;
    var target = ENTITIES[f.source.entity];
    var list = f.source.entity === entity ? rows : readTable_(target.sheet);
    var found = list.some(function (r) { return String(r[target.key]) === String(clean[f.name]); });
    if (!found) throw new Error('القيمة "' + clean[f.name] + '" غير موجودة في ' + target.plural + '.');
    if (f.source.entity === entity && String(clean[f.name]) === String(key)) {
      throw new Error('لا يمكن ربط السجل بنفسه في الحقل: ' + f.label);
    }
  });
  if (entity === 'accounts' && clean.MainAccount) checkAccountCycle_(rows, String(key), String(clean.MainAccount));

  // قيود التفرد المركبة
  (cfg.unique || []).forEach(function (combo) {
    var dup = rows.some(function (r) {
      if (existing && r._row === existing._row) return false;
      return combo.every(function (c) { return String(r[c]).toLowerCase() === String(clean[c]).toLowerCase(); });
    });
    if (dup) throw new Error('يوجد سجل بنفس القيم: ' + combo.map(function (c) { return fieldLabel_(cfg, c); }).join(' + '));
  });

  // الحقول المشتقة
  cfg.fields.forEach(function (f) {
    if (!f.derive) return;
    var t = ENTITIES[f.derive.entity];
    var src = readTable_(t.sheet).filter(function (r) { return String(r[t.key]) === String(clean[f.derive.from]); })[0];
    clean[f.name] = src ? src[f.derive.field] : '';
  });

  var now = new Date();
  if (mode === 'add') {
    clean[cfg.createdField || 'CreatedAt'] = now;
    clean.CreatedBy = u.Username;
    appendObj_(cfg.sheet, clean);
    audit_(u, 'إضافة', entity, key);
  } else {
    clean.ModifiedAt = now;
    clean.ModifiedBy = u.Username;
    updateObj_(cfg.sheet, existing, clean);
    audit_(u, 'تعديل', entity, key);
    // تحديث اسم الحساب في المشروعات عند تغييره
    if (entity === 'accounts' && String(existing.AccountName) !== String(clean.AccountName)) {
      readTable_('Projects').forEach(function (p) {
        if (String(p.AccountId) === String(key)) updateObj_('Projects', p, { AccountName: clean.AccountName });
      });
    }
  }
  var saved = readTable_(cfg.sheet).filter(function (r) { return String(r[cfg.key]) === String(key); })[0];
  return serialize_(cfg, saved);
}

function checkAccountCycle_(rows, key, parent) {
  var map = {};
  rows.forEach(function (r) { map[String(r.AccountId)] = String(r.MainAccount || ''); });
  var cur = parent, guard = 0;
  while (cur && guard++ < 1000) {
    if (cur === key) throw new Error('لا يمكن جعل الحساب تابعاً لأحد حساباته الفرعية.');
    cur = map[cur];
  }
}

function fieldLabel_(cfg, name) {
  var f = cfg.fields.filter(function (x) { return x.name === name; })[0];
  return f ? f.label : name;
}

function apiDelete(token, entity, keys) {
  return run_(function () {
    var u = requireUser_(token);
    var cfg = entityCfg_(entity);
    if (cfg.readOnly) throw new Error('هذه الصفحة للعرض فقط.');
    requirePerm_(u, cfg.page, 'delete');
    keys = (keys || []).map(String);
    if (!keys.length) throw new Error('لم يتم اختيار أي سجل.');
    return withLock_(function () {
      var rows = readTable_(cfg.sheet);
      var targets = rows.filter(function (r) { return keys.indexOf(String(r[cfg.key])) >= 0; });
      if (cfg.doc) return deleteDocs_(u, entity, cfg, targets);
      if (entity === 'users') checkUserDelete_(u, rows, targets);
      targets.forEach(function (t) { checkRefs_(cfg, t); });
      deleteRows_(cfg.sheet, targets.map(function (t) { return t._row; }));
      targets.forEach(function (t) { audit_(u, 'حذف', entity, t[cfg.key]); });
      return targets.length;
    });
  });
}

/** منع حذف سجل مستخدم في سجلات أخرى */
function checkRefs_(cfg, rec) {
  (cfg.refs || []).forEach(function (ref) {
    if (ref.when) {
      var match = Object.keys(ref.when).every(function (k) { return String(rec[k]) === String(ref.when[k]); });
      if (!match) return;
    }
    var val = String(rec[ref.match || cfg.key]);
    var used = readTable_(ref.sheet || ENTITIES[ref.entity].sheet).filter(function (r) { return String(r[ref.field]) === val; }).length;
    if (used) {
      throw new Error('لا يمكن حذف "' + (rec[cfg.titleField] || val) + '" لأنه مستخدم في ' + used + ' ' + ref.label +
        '. يمكنك إلغاء تفعيله بدلاً من الحذف.');
    }
  });
}

/* ================= المستخدمون ================= */

function saveUser_(u, rec, mode, origKey) {
  var cfg = ENTITIES.users;
  var rows = readTable_('Users');
  var existing = null;
  if (mode === 'edit') {
    existing = rows.filter(function (r) { return String(r.UserId) === String(origKey); })[0];
    if (!existing) throw new Error('المستخدم غير موجود.');
  }

  var username = String(rec.Username || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
    throw new Error('اسم المستخدم: من 3 إلى 30 حرفاً إنجليزياً أو أرقاماً أو (. _ -) بدون مسافات.');
  }
  var dup = rows.some(function (r) {
    return String(r.Username).toLowerCase() === username && (!existing || r._row !== existing._row);
  });
  if (dup) throw new Error('اسم المستخدم مستخدم من قبل.');

  var fullName = safeText_(rec.FullName);
  if (!fullName) throw new Error('الحقل مطلوب: الاسم الكامل');
  var email = normalize_({ type: 'email', label: 'البريد' }, rec.Email);
  if (!email) throw new Error('الحقل مطلوب: البريد الإلكتروني');
  var emailDup = rows.some(function (r) {
    return String(r.Email).toLowerCase() === email && (!existing || r._row !== existing._row);
  });
  if (emailDup) throw new Error('البريد الإلكتروني مستخدم لحساب آخر.');

  var isActive = isTrue_(rec.IsActive);
  var isAdmin = isTrue_(rec.IsAdmin);
  var perms = sanitizePerms_(rec._perms || {});

  // حماية من إقفال النظام
  if (existing && String(existing.UserId) === String(u.UserId)) {
    if (!isActive) throw new Error('لا يمكنك إيقاف حسابك الحالي.');
    if (isTrue_(existing.IsAdmin) && !isAdmin) throw new Error('لا يمكنك إزالة صلاحية مدير النظام عن حسابك الحالي.');
  }
  if (existing && isTrue_(existing.IsAdmin) && (!isAdmin || !isActive)) {
    var otherAdmins = rows.filter(function (r) {
      return r._row !== existing._row && isTrue_(r.IsAdmin) && isTrue_(r.IsActive);
    }).length;
    if (!otherAdmins) throw new Error('يجب أن يبقى مدير نظام نشط واحد على الأقل.');
  }
  // غير المدير: لا يمنح صلاحية مدير، ولا يعدّل حساب مدير، ولا يمنح صلاحيات لا يملكها هو
  if (!isTrue_(u.IsAdmin)) {
    if (isAdmin) throw new Error('فقط مدير النظام يمكنه منح صلاحية مدير النظام.');
    if (existing && isTrue_(existing.IsAdmin)) throw new Error('فقط مدير النظام يمكنه تعديل حساب مدير نظام.');
    var mine = userPerms_(u);
    Object.keys(perms).forEach(function (p) {
      perms[p] = perms[p].filter(function (a) { return (mine[p] || []).indexOf(a) >= 0; });
      if (!perms[p].length) delete perms[p];
    });
  }

  var obj = {
    Username: username, FullName: fullName, Email: email, IsActive: isActive, IsAdmin: isAdmin,
    MustChangePassword: isTrue_(rec.MustChangePassword), Permissions: JSON.stringify(perms)
  };

  var pw = rec.Password ? String(rec.Password) : '';
  if (mode === 'add' && !pw) throw new Error('كلمة المرور مطلوبة للمستخدم الجديد.');
  if (pw) {
    validatePassword_(pw);
    if (pw !== String(rec.ConfirmPassword || '')) throw new Error('كلمة المرور وتأكيدها غير متطابقين.');
    obj.Salt = newSalt_();
    obj.PasswordHash = hashPassword_(pw, obj.Salt);
  }

  var now = new Date();
  var id;
  if (mode === 'add') {
    id = nextId_(rows, 'UserId');
    obj.UserId = id;
    obj.CreatedAt = now;
    obj.CreatedBy = u.Username;
    appendObj_('Users', obj);
    audit_(u, 'إضافة', 'users', username);
  } else {
    id = existing.UserId;
    obj.ModifiedAt = now;
    obj.ModifiedBy = u.Username;
    updateObj_('Users', existing, obj);
    audit_(u, pw ? 'تعديل + تغيير كلمة المرور' : 'تعديل', 'users', username);
  }
  var saved = readTable_('Users').filter(function (r) { return String(r.UserId) === String(id); })[0];
  var out = serialize_(cfg, saved);
  out._perms = userPerms_(saved);
  return out;
}

function checkUserDelete_(u, rows, targets) {
  targets.forEach(function (t) {
    if (String(t.UserId) === String(u.UserId)) throw new Error('لا يمكنك حذف حسابك الحالي.');
    if (isTrue_(t.IsAdmin) && !isTrue_(u.IsAdmin)) throw new Error('فقط مدير النظام يمكنه حذف حساب مدير نظام.');
  });
  var remainingAdmins = rows.filter(function (r) {
    return isTrue_(r.IsAdmin) && isTrue_(r.IsActive) && targets.indexOf(r) < 0;
  }).length;
  if (!remainingAdmins) throw new Error('يجب أن يبقى مدير نظام نشط واحد على الأقل.');
}

/** تغيير كلمة مرور المستخدم الحالي */
function apiChangePassword(token, oldPw, newPw, confirmPw) {
  return run_(function () {
    var u = requireUser_(token);
    if (!safeEquals_(hashPassword_(String(oldPw || ''), String(u.Salt)), String(u.PasswordHash))) {
      throw new Error('كلمة المرور الحالية غير صحيحة.');
    }
    validatePassword_(newPw);
    if (String(newPw) !== String(confirmPw)) throw new Error('كلمة المرور الجديدة وتأكيدها غير متطابقين.');
    if (String(newPw) === String(oldPw)) throw new Error('كلمة المرور الجديدة يجب أن تختلف عن الحالية.');
    return withLock_(function () {
      var salt = newSalt_();
      updateObj_('Users', u, { Salt: salt, PasswordHash: hashPassword_(String(newPw), salt), MustChangePassword: false });
      audit_(u, 'تغيير كلمة المرور', 'users', u.Username);
      return true;
    });
  });
}
