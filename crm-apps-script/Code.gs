/**
 * CRM Console — Customer balances & collections (Dynamics 365 data)
 * Google Apps Script backend. Google Sheets is the database.
 *
 * First run: open the Apps Script editor and run `setup()` once.
 * Default login: admin / admin123  (change it from the Users page).
 */

// ───────────────────────────── Schema ─────────────────────────────
// Each field: [key, sheet header]. Headers match the Dynamics 365 export
// names so exported data can be pasted directly under them.
const SCHEMA = {
  Customers: [
    ['account', 'Customer account'], ['name', 'Name'], ['group', 'Customer group'],
    ['currency', 'Currency'], ['contactPerson', 'Contact Person'], ['phone', 'Contact Number'],
    ['email', 'Email'], ['address', 'Address'], ['city', 'City'], ['country', 'Country'],
    ['taxNo', 'Tax Number'], ['creditLimit', 'Credit Limit'], ['termsDays', 'Payment Terms Days'],
    ['collector', 'Collector'], ['status', 'Status'], ['notes', 'Notes'],
    ['createdAt', 'Created date and time'], ['updatedBy', 'Updated By'], ['updatedAt', 'Updated At']
  ],
  Transactions: [
    ['voucher', 'Voucher'], ['type', 'Transaction type'], ['account', 'Customer account'],
    ['date', 'Date'], ['description', 'Description'], ['dueDate', 'Due Date'],
    ['amountCur', 'Amount in transaction currency'], ['currency', 'Currency'],
    ['exchange', 'Exchange rate'], ['creditMST', 'Credit in local currency'],
    ['debitMST', 'Debit in local currency'], ['userAdd', 'user add'],
    ['createdById', 'created_by_user_id'], ['createdByName', 'created_by_name'],
    ['createdAt', 'created_at'], ['updatedByName', 'updated_by_name'], ['updatedAt', 'updated_at'],
    ['isDeleted', 'is_deleted'], ['postStatus', 'posting_status'], ['postedBy', 'posted_by'],
    ['postedAt', 'posted_at'], ['rowId', 'row_id'],
    // Collection receipts (added in v3): method, cheque / transfer details, collector.
    ['payMethod', 'Payment method'], ['chequeNo', 'Cheque number'], ['chequeDate', 'Cheque date'],
    ['bankName', 'Bank'], ['payRef', 'Payment reference'], ['collectedBy', 'Collected by']
  ],
  CustomerGroups: [['groupId', 'GroupId'], ['groupName', 'GroupName']],
  Users: [
    ['userId', 'UserId'], ['username', 'Username'], ['fullName', 'Full Name'], ['email', 'Email'],
    ['passwordHash', 'PasswordHash'], ['salt', 'Salt'], ['role', 'Role'], ['pages', 'Pages'],
    ['canAdd', 'CanAdd'], ['canEdit', 'CanEdit'], ['canDelete', 'CanDelete'], ['canPost', 'CanPost'],
    ['isCollector', 'IsCollector'], ['scope', 'DataScope'], ['active', 'Active'],
    ['lastLogin', 'LastLogin'], ['createdAt', 'CreatedAt']
  ],
  FollowUps: [
    ['id', 'FollowUpId'], ['account', 'Customer account'], ['voucher', 'Voucher'],
    ['actionDate', 'Action Date'], ['actionType', 'Action Type'], ['note', 'Note'],
    ['promiseDate', 'Promise Date'], ['promiseAmount', 'Promise Amount'], ['status', 'Status'],
    ['createdBy', 'Created By'], ['createdAt', 'Created At']
  ],
  // Links a collection receipt (payment row) to the invoices it pays.
  Allocations: [
    ['id', 'AllocationId'], ['paymentRowId', 'Payment row_id'], ['paymentVoucher', 'Payment voucher'],
    ['account', 'Customer account'], ['invoiceVoucher', 'Invoice voucher'], ['amount', 'Amount (local)'],
    ['date', 'Date'], ['createdBy', 'Created By'], ['createdAt', 'Created At']
  ],
  // Messages between users + system notifications (to = usernames comma list, or ALL).
  Messages: [
    ['id', 'MessageId'], ['from', 'From'], ['to', 'To'], ['subject', 'Subject'], ['body', 'Body'], ['type', 'Type'],
    ['account', 'Customer account'], ['replyTo', 'ReplyTo'], ['createdAt', 'Created At'], ['readBy', 'ReadBy'], ['deletedBy', 'DeletedBy']
  ],
  Currencies: [['code', 'Code'], ['name', 'Name'], ['rate', 'Rate to reporting currency'], ['active', 'Active'], ['updatedAt', 'Updated At']],
  Settings: [['key', 'Key'], ['value', 'Value']]
};

const ID_FIELD = { Customers: 'account', Transactions: 'rowId', CustomerGroups: 'groupId', Users: 'userId', FollowUps: 'id', Currencies: 'code', Allocations: 'id', Messages: 'id' };
const DATE_FIELDS = ['date', 'dueDate', 'createdAt', 'updatedAt', 'postedAt', 'lastLogin', 'actionDate', 'promiseDate', 'chequeDate'];
const NUMBER_FIELDS = ['amountCur', 'exchange', 'creditMST', 'debitMST', 'creditLimit', 'termsDays', 'promiseAmount', 'rate', 'amount'];
const BOOL_FIELDS = ['isDeleted', 'canAdd', 'canEdit', 'canDelete', 'canPost', 'isCollector', 'active'];

const ALL_PAGES = ['dashboard', 'customers', 'transactions', 'receipts', 'groups', 'statement', 'balances', 'paid',
  'overdue', 'credit', 'followup', 'collection', 'collections', 'performance', 'currencies', 'import', 'users'];
const PAY_METHODS = ['Cash', 'Cheque', 'Transfer'];

// Which entity each page edits (used for permission checks on writes).
const ENTITY_PAGE = { Customers: 'customers', Transactions: 'transactions', CustomerGroups: 'groups', FollowUps: 'followup', Users: 'users', Currencies: 'currencies' };

/** Must match CLIENT_VERSION in Script.html — a mismatch means Code.gs was not updated/deployed. */
const APP_VERSION = '7';
function getVersion() { return APP_VERSION; }
/** Public branding for the sign-in screen (no login needed, nothing sensitive). */
function getBranding() {
  const s = getSettings_();
  return { AppName: s.AppName || '', CompanyName: s.CompanyName || '', CompanyLogo: s.CompanyLogo || '' };
}

// Per-execution read cache: every server call re-reads the sheet once at most.
const MEMO = {};
function invalidate_() { Object.keys(MEMO).forEach(function (k) { if (k.indexOf('hdr_') !== 0) delete MEMO[k]; }); }

/** Idle minutes before a session expires (Settings → SessionMinutes, max 360). */
function sessionSeconds_() {
  const m = +getSettings_().SessionMinutes || 60;
  return Math.max(5, Math.min(m, 360)) * 60;
}
const TZ = Session.getScriptTimeZone();

// ───────────────────────────── Web app ─────────────────────────────
function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('CRM Console')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('CRM')
    .addItem('Setup / repair sheets', 'setup')
    .addItem('Load demo data', 'loadDemoData')
    .addToUi();
}

// ───────────────────────────── Setup ─────────────────────────────
function setup() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(SCHEMA).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const headers = SCHEMA[name].map(function (f) { return f[1]; });
    const lastCol = Math.max(sh.getLastColumn(), 1);
    const existing = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
    const missing = headers.filter(function (h) { return existing.indexOf(h) === -1; });
    if (sh.getLastRow() === 0 || existing.join('') === '') {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else if (missing.length) {
      sh.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
    }
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#111114').setFontColor('#fafafa');
  });
  // Default admin
  if (!readTable('Users').some(function (u) { return String(u.username).toLowerCase() === 'admin'; })) {
    const salt = Utilities.getUuid();
    appendRows('Users', [{
      userId: Utilities.getUuid(), username: 'admin', fullName: 'Administrator', email: '',
      passwordHash: hash_('admin123', salt), salt: salt, role: 'Admin', pages: ALL_PAGES.join(','),
      canAdd: true, canEdit: true, canDelete: true, canPost: true, isCollector: false,
      scope: 'all', active: true, createdAt: new Date()
    }]);
  }
  const settings = readTable('Settings');
  const defaults = { AppName: 'CRM Console', LocalCurrency: 'SAR', ReportCurrency: 'SAR', ConversionBasis: 'local', CompanyName: 'My Company',
    CompanyAddress: '', CompanyPhone: '', CompanyEmail: '', BankDetails: '', StatementNote: '', WhatsAppCountryCode: '', SessionMinutes: 60 };
  const toAdd = Object.keys(defaults).filter(function (k) {
    return !settings.some(function (s) { return s.key === k; });
  }).map(function (k) { return { key: k, value: defaults[k] }; });
  if (toAdd.length) appendRows('Settings', toAdd);
  const blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);
  return 'Setup complete';
}

// ───────────────────────────── Sheet helpers ─────────────────────────────
function sheet_(name) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if (!sh && SCHEMA[name]) { // new tables added in later versions are created on first use
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, SCHEMA[name].length).setValues([SCHEMA[name].map(function (f) { return f[1]; })]);
    sh.setFrozenRows(1);
  }
  if (!sh) throw new Error('Sheet "' + name + '" not found. Run setup() first.');
  if (SCHEMA[name] && !MEMO['hdr_' + name]) { // add columns introduced by newer versions
    MEMO['hdr_' + name] = true;
    const lastCol = Math.max(sh.getLastColumn(), 1);
    const have = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); });
    const missing = SCHEMA[name].map(function (f) { return f[1]; }).filter(function (h) { return have.indexOf(h) === -1; });
    if (missing.length) sh.getRange(1, (have.join('') === '' ? 0 : lastCol) + 1, 1, missing.length).setValues([missing]);
  }
  return sh;
}

function headerMap_(sh) {
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  const map = {};
  headers.forEach(function (h, i) { map[h] = i; });
  return { headers: headers, map: map };
}

function fieldIndex_(name, hm) {
  const out = {};
  SCHEMA[name].forEach(function (f) { if (hm.map[f[1]] !== undefined) out[f[0]] = hm.map[f[1]]; });
  return out;
}

/** Reads a sheet into plain objects (dates → yyyy-MM-dd strings for transport). */
function readTable(name, keepDates) {
  const key = name + (keepDates ? '#d' : '');
  if (!MEMO[key]) MEMO[key] = readTableRaw_(name, keepDates);
  return MEMO[key];
}

function readTableRaw_(name, keepDates) {
  const sh = sheet_(name);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const hm = headerMap_(sh);
  const idx = fieldIndex_(name, hm);
  const values = sh.getRange(2, 1, lastRow - 1, hm.headers.length).getValues();
  const out = [];
  for (let r = 0; r < values.length; r++) {
    const row = values[r];
    if (row.join('') === '') continue;
    const o = { _row: r + 2 };
    for (const k in idx) o[k] = normalizeValue_(k, row[idx[k]], keepDates);
    out.push(o);
  }
  return out;
}

function normalizeValue_(key, v, keepDates) {
  if (DATE_FIELDS.indexOf(key) > -1) {
    const d = toDate_(v);
    if (!d) return '';
    if (keepDates) return d;
    return Utilities.formatDate(d, TZ, (key === 'createdAt' || key === 'updatedAt' || key === 'postedAt' || key === 'lastLogin') ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd');
  }
  if (NUMBER_FIELDS.indexOf(key) > -1) return toNum_(v);
  if (BOOL_FIELDS.indexOf(key) > -1) return toBool_(v);
  return v === null || v === undefined ? '' : String(v).trim();
}

function toDate_(v) {
  if (v === '' || v === null || v === undefined) return null;
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v) ? null : v;
  if (typeof v === 'number') return new Date(Math.round((v - 25569) * 86400000)); // Excel serial
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
  m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?)?/i);
  if (m) { // D365 exports usually use M/D/YYYY
    let h = +(m[4] || 0);
    if (m[6] && /pm/i.test(m[6]) && h < 12) h += 12;
    if (m[6] && /am/i.test(m[6]) && h === 12) h = 0;
    const a = +m[1], b = +m[2];
    const month = a > 12 ? b : a, day = a > 12 ? a : b;
    return new Date(+m[3], month - 1, day, h, +(m[5] || 0));
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function toNum_(v) {
  if (v === '' || v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace(/[^\d.\-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function toBool_(v) {
  if (typeof v === 'boolean') return v;
  return /^(true|yes|1|y|نعم)$/i.test(String(v).trim());
}

function toSheetValue_(key, v) {
  if (DATE_FIELDS.indexOf(key) > -1) return toDate_(v) || '';
  if (NUMBER_FIELDS.indexOf(key) > -1) return v === '' || v === null || v === undefined ? '' : toNum_(v);
  if (BOOL_FIELDS.indexOf(key) > -1) return toBool_(v);
  return v === null || v === undefined ? '' : v;
}

function appendRows(name, objs) {
  if (!objs.length) return;
  invalidate_();
  const sh = sheet_(name);
  const hm = headerMap_(sh);
  const idx = fieldIndex_(name, hm);
  const rows = objs.map(function (o) {
    const row = new Array(hm.headers.length).fill('');
    for (const k in idx) if (o[k] !== undefined) row[idx[k]] = toSheetValue_(k, o[k]);
    return row;
  });
  const chunk = 5000;
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    sh.getRange(sh.getLastRow() + 1, 1, part.length, hm.headers.length).setValues(part);
  }
}

function findRow_(name, id) {
  const sh = sheet_(name);
  const hm = headerMap_(sh);
  const col = fieldIndex_(name, hm)[ID_FIELD[name]];
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const ids = sh.getRange(2, col + 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]).trim() === String(id).trim()) return i + 2;
  return -1;
}

function updateRow_(name, rowNum, patch) {
  invalidate_();
  const sh = sheet_(name);
  const hm = headerMap_(sh);
  const idx = fieldIndex_(name, hm);
  const range = sh.getRange(rowNum, 1, 1, hm.headers.length);
  const row = range.getValues()[0];
  for (const k in patch) if (idx[k] !== undefined) row[idx[k]] = toSheetValue_(k, patch[k]);
  range.setValues([row]);
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return fn(); } finally { invalidate_(); lock.releaseLock(); }
}

function getSettings_() {
  const o = {};
  readTable('Settings').forEach(function (s) { o[s.key] = s.value; });
  return o;
}

// ───────────────────────────── Auth ─────────────────────────────
function hash_(password, salt) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '|' + password, Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function login(username, password) {
  const user = readTable('Users').filter(function (u) {
    return String(u.username).toLowerCase() === String(username || '').trim().toLowerCase();
  })[0];
  if (!user || !user.active || hash_(password, user.salt) !== user.passwordHash) {
    throw new Error('INVALID_LOGIN');
  }
  user.isAdmin = user.role === 'Admin';
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put('sess_' + token, user.userId, sessionSeconds_());
  updateRow_('Users', user._row, { lastLogin: new Date() });
  return { token: token, user: publicUser_(user), settings: getSettings_(), lookups: lookups_(user) };
}

function logout(token) {
  CacheService.getScriptCache().remove('sess_' + token);
  return true;
}

function resume(token) {
  const user = auth_(token);
  return { token: token, user: publicUser_(user), settings: getSettings_(), lookups: lookups_(user) };
}

function auth_(token, page, noSlide) {
  const userId = token && CacheService.getScriptCache().get('sess_' + token);
  if (!userId) throw new Error('SESSION_EXPIRED');
  const user = readTable('Users').filter(function (u) { return u.userId === userId; })[0];
  if (!user || !user.active) throw new Error('SESSION_EXPIRED');
  if (!noSlide) CacheService.getScriptCache().put('sess_' + token, userId, sessionSeconds_()); // sliding idle timeout
  user.isAdmin = user.role === 'Admin';
  user.pageList = user.isAdmin ? ALL_PAGES.slice() : String(user.pages || '').split(',').map(function (p) { return p.trim(); }).filter(String);
  if (page && !user.isAdmin && user.pageList.indexOf(page) === -1) throw new Error('NO_PERMISSION');
  return user;
}

function requireAction_(user, action) {
  if (user.isAdmin) return;
  const flag = { add: 'canAdd', edit: 'canEdit', delete: 'canDelete', post: 'canPost' }[action];
  if (!user[flag]) throw new Error('NO_PERMISSION');
}

function publicUser_(u) {
  const isAdmin = u.role === 'Admin';
  return {
    userId: u.userId, username: u.username, fullName: u.fullName, email: u.email, role: u.role,
    pages: isAdmin ? ALL_PAGES : String(u.pages || '').split(',').map(function (p) { return p.trim(); }).filter(String),
    canAdd: isAdmin || u.canAdd, canEdit: isAdmin || u.canEdit, canDelete: isAdmin || u.canDelete,
    canPost: isAdmin || u.canPost, isCollector: u.isCollector, scope: u.scope || 'all', isAdmin: isAdmin
  };
}

/** Customers the user is allowed to see (DataScope = own → only their collector accounts). */
function visibleCustomers_(user) {
  const all = readTable('Customers');
  if (user.isAdmin || user.scope !== 'own') return all;
  return all.filter(function (c) { return c.collector === user.username; });
}

function lookups_(user) {
  const users = readTable('Users');
  return {
    groups: readTable('CustomerGroups').map(function (g) { return { id: g.groupId, name: g.groupName }; }),
    collectors: users.filter(function (u) { return u.isCollector && u.active; })
      .map(function (u) { return { username: u.username, name: u.fullName || u.username }; }),
    customers: visibleCustomers_(user).map(function (c) { return { account: c.account, name: c.name }; }),
    currencies: readTable('Currencies').map(function (c) { return { code: String(c.code).toUpperCase(), name: c.name, rate: c.rate }; }),
    users: users.filter(function (u) { return u.active; }).map(function (u) { return { username: u.username, name: u.fullName || u.username }; }),
    payMethods: PAY_METHODS,
    transactionTypes: ['Invoice', 'Payment', 'Credit note', 'Debit note', 'Settlement', 'Opening balance', 'Adjustment']
  };
}

function getLookups(token) { return lookups_(auth_(token)); }

// ───────────────────────────── Generic list ─────────────────────────────
/**
 * Server-side search / filter / sort / paging so big D365 tables stay fast on mobile.
 * opts: { q, filters: {field: value}, dateFrom, dateTo, sort, desc, page, pageSize }
 */
function listRecords(token, entity, opts) {
  opts = opts || {};
  const page = ENTITY_PAGE[entity];
  if (!page) throw new Error('Unknown entity');
  const user = auth_(token, opts.receipts ? 'receipts' : page);
  if (entity === 'Users' && !user.isAdmin) throw new Error('NO_PERMISSION');
  if (entity === 'Transactions') ensureRowIds_();
  let rows;
  if (entity === 'Customers') rows = visibleCustomers_(user);
  else rows = readTable(entity);

  if (entity === 'Transactions' || entity === 'FollowUps') {
    const allowed = {};
    visibleCustomers_(user).forEach(function (c) { allowed[c.account] = c; });
    rows = rows.filter(function (r) { return allowed[r.account] !== undefined; }).map(function (r0) {
      const r = Object.assign({}, r0), c = allowed[r.account];
      r.customerName = c.name; r.group = c.group; r.custCurrency = c.currency;
      return r;
    });
    if (entity === 'Transactions') {
      rows.forEach(function (r) { if (!r.postStatus) r.postStatus = 'Posted'; });
      if (!opts.showDeleted) rows = rows.filter(function (r) { return !r.isDeleted; });
      // Running customer balance (local currency, posted rows, date order).
      const byCust = {};
      rows.forEach(function (r) { if (r.postStatus !== 'Draft') (byCust[r.account] = byCust[r.account] || []).push(r); });
      Object.keys(byCust).forEach(function (a) {
        let run = 0;
        byCust[a].sort(function (x, y) {
          return x.date < y.date ? -1 : x.date > y.date ? 1 : String(x.createdAt).localeCompare(String(y.createdAt)) || String(x.voucher).localeCompare(String(y.voucher), undefined, { numeric: true });
        }).forEach(function (r) { run = round2_(run + (+r.debitMST || 0) - (+r.creditMST || 0)); r.balance = run; });
      });
    }
  }
  if (entity === 'Transactions' && opts.receipts) {
    const re = /pay|receipt|دفع|سداد|تحصيل|قبض/i;
    rows = rows.filter(function (r) { return r.payMethod || (+r.creditMST > 0 && re.test(r.type)); });
    const al = allocationsByPayment_();
    rows.forEach(function (r) {
      r.allocText = (al[r.rowId] || []).map(function (a) { return a.invoiceVoucher + ' (' + fmtInt_(a.amount) + ')'; }).join('، ');
    });
  }
  if (opts.voucher) {
    const v = String(opts.voucher).trim().toLowerCase();
    rows = rows.filter(function (r) { return String(r.voucher).toLowerCase().indexOf(v) > -1; });
  }
  if (entity === 'Users') rows = rows.map(function (u) { const o = Object.assign({}, u); delete o.passwordHash; delete o.salt; return o; });

  const q = String(opts.q || '').trim().toLowerCase();
  if (q) rows = rows.filter(function (r) {
    for (const k in r) if (k !== '_row' && String(r[k]).toLowerCase().indexOf(q) > -1) return true;
    return false;
  });
  const filters = opts.filters || {};
  Object.keys(filters).forEach(function (k) {
    const v = filters[k];
    if (v === '' || v === null || v === undefined) return;
    rows = rows.filter(function (r) { return String(r[k]) === String(v); });
  });
  const dateKey = entity === 'FollowUps' ? 'actionDate' : 'date';
  if (opts.dateFrom) rows = rows.filter(function (r) { return r[dateKey] && r[dateKey] >= opts.dateFrom; });
  if (opts.dateTo) rows = rows.filter(function (r) { return r[dateKey] && r[dateKey] <= opts.dateTo; });

  const sortKey = opts.sort || (entity === 'Transactions' ? 'date' : entity === 'FollowUps' ? 'actionDate' : ID_FIELD[entity]);
  const desc = opts.desc !== undefined ? opts.desc : (entity === 'Transactions' || entity === 'FollowUps');
  rows.sort(function (a, b) {
    const x = a[sortKey], y = b[sortKey];
    const c = (typeof x === 'number' && typeof y === 'number') ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true });
    return desc ? -c : c;
  });

  const totals = {};
  if (entity === 'Transactions') {
    totals.debit = sum_(rows, 'debitMST');
    totals.credit = sum_(rows, 'creditMST');
    totals.net = round2_(totals.debit - totals.credit);
    if (opts.receipts) {
      totals.byMethod = { Cash: 0, Cheque: 0, Transfer: 0, Other: 0 };
      rows.forEach(function (r) {
        const k = totals.byMethod[r.payMethod] !== undefined ? r.payMethod : 'Other';
        totals.byMethod[k] = round2_(totals.byMethod[k] + (+r.creditMST || 0) - (+r.debitMST || 0));
      });
    }
    totals.localCurrency = getSettings_().LocalCurrency || '';
  }
  const size = Math.min(Math.max(+opts.pageSize || 25, 5), 500);
  const total = rows.length;
  const p = Math.max(1, Math.min(+opts.page || 1, Math.ceil(total / size) || 1));
  return { rows: opts.all ? rows : rows.slice((p - 1) * size, p * size), total: total, page: p, pageSize: size, totals: totals };
}

function sum_(rows, key) {
  return round2_(rows.reduce(function (s, r) { return s + (+r[key] || 0); }, 0));
}
function round2_(n) { return Math.round(n * 100) / 100; }
/** Whole number with thousands separators, for texts built on the server. */
function fmtInt_(n) { return String(Math.round(+n || 0) || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

// ───────────────────────────── Save / delete / post ─────────────────────────────
function saveRecord(token, entity, record, isNew) {
  const page = ENTITY_PAGE[entity];
  if (!page) throw new Error('Unknown entity');
  const user = auth_(token, page);
  requireAction_(user, isNew ? 'add' : 'edit');
  return withLock_(function () {
    const now = new Date();
    const who = user.fullName || user.username;
    const rec = Object.assign({}, record);
    delete rec._row;

    if (entity === 'Customers') {
      if (!rec.account || !rec.name) throw new Error('REQUIRED_FIELDS');
      if (user.scope === 'own' && !user.isAdmin) rec.collector = user.username;
      rec.updatedBy = who; rec.updatedAt = now;
      if (isNew) {
        if (findRow_('Customers', rec.account) > -1) throw new Error('DUPLICATE_ID');
        rec.createdAt = rec.createdAt || now;
        rec.status = rec.status || 'Active';
      }
    } else if (entity === 'Transactions') {
      if (!rec.account || !rec.date) throw new Error('REQUIRED_FIELDS');
      assertCustomerVisible_(user, rec.account);
      const debit = toNum_(rec.debitMST), credit = toNum_(rec.creditMST);
      rec.amountCur = rec.amountCur !== '' && rec.amountCur !== undefined ? rec.amountCur : round2_(credit - debit);
      rec.exchange = rec.exchange || 1;
      if (isNew) {
        rec.rowId = Utilities.getUuid();
        rec.createdById = user.userId; rec.createdByName = who; rec.createdAt = now;
        rec.userAdd = rec.userAdd || user.username;
        rec.isDeleted = false;
        rec.postStatus = 'Draft';
      } else {
        const existing = getById_(entity, rec.rowId);
        if (existing.postStatus === 'Posted') throw new Error('POSTED_LOCKED');
        if ((allocationsByPayment_()[rec.rowId] || []).length) throw new Error('RECEIPT_LOCKED');
        ['createdById', 'createdByName', 'createdAt', 'userAdd', 'postStatus', 'postedBy', 'postedAt', 'isDeleted']
          .forEach(function (k) { delete rec[k]; });
      }
      rec.updatedByName = who; rec.updatedAt = now;
    } else if (entity === 'CustomerGroups') {
      if (!rec.groupId || !rec.groupName) throw new Error('REQUIRED_FIELDS');
      if (isNew && findRow_(entity, rec.groupId) > -1) throw new Error('DUPLICATE_ID');
    } else if (entity === 'FollowUps') {
      if (!rec.account) throw new Error('REQUIRED_FIELDS');
      assertCustomerVisible_(user, rec.account);
      if (isNew) { rec.id = Utilities.getUuid(); rec.createdBy = who; rec.createdAt = now; }
      rec.actionDate = rec.actionDate || now;
      rec.status = rec.status || 'Open';
    } else if (entity === 'Users') {
      if (!user.isAdmin) throw new Error('NO_PERMISSION');
      return saveUser_(rec, isNew);
    } else if (entity === 'Currencies') {
      rec.code = String(rec.code || '').trim().toUpperCase();
      if (!rec.code) throw new Error('REQUIRED_FIELDS');
      const s = getSettings_();
      if (rec.code === String(s.ReportCurrency || '').toUpperCase()) rec.rate = 1;
      if (!(toNum_(rec.rate) > 0)) throw new Error('RATE_REQUIRED');
      if (isNew && findRow_(entity, rec.code) > -1) throw new Error('DUPLICATE_ID');
      rec.active = rec.active === undefined ? true : rec.active;
      rec.updatedAt = now;
    }

    if (isNew) appendRows(entity, [rec]);
    else {
      const rowNum = findRow_(entity, rec[ID_FIELD[entity]]);
      if (rowNum < 0) throw new Error('NOT_FOUND');
      updateRow_(entity, rowNum, rec);
    }
    return true;
  });
}

function getById_(entity, id) {
  const r = readTable(entity).filter(function (x) { return String(x[ID_FIELD[entity]]) === String(id); })[0];
  if (!r) throw new Error('NOT_FOUND');
  return r;
}

function assertCustomerVisible_(user, account) {
  if (!visibleCustomers_(user).some(function (c) { return c.account === account; })) throw new Error('NO_PERMISSION');
}

function saveUser_(rec, isNew) {
  if (!rec.username) throw new Error('REQUIRED_FIELDS');
  const users = readTable('Users');
  const clash = users.some(function (u) {
    return String(u.username).toLowerCase() === String(rec.username).toLowerCase() && u.userId !== rec.userId;
  });
  if (clash) throw new Error('DUPLICATE_ID');
  if (Array.isArray(rec.pages)) rec.pages = rec.pages.join(',');
  const pw = rec.password; delete rec.password;
  if (pw) { rec.salt = Utilities.getUuid(); rec.passwordHash = hash_(pw, rec.salt); }
  delete rec.lastLogin;
  if (isNew) {
    if (!pw) throw new Error('PASSWORD_REQUIRED');
    rec.userId = Utilities.getUuid(); rec.createdAt = new Date();
    appendRows('Users', [rec]);
  } else {
    const rowNum = findRow_('Users', rec.userId);
    if (rowNum < 0) throw new Error('NOT_FOUND');
    updateRow_('Users', rowNum, rec);
  }
  return true;
}

function deleteRecord(token, entity, id) {
  const page = ENTITY_PAGE[entity];
  const user = auth_(token, page);
  requireAction_(user, 'delete');
  return withLock_(function () {
    if (entity === 'Transactions') {
      const t = getById_(entity, id);
      assertCustomerVisible_(user, t.account);
      if (t.postStatus === 'Posted' && !user.isAdmin) throw new Error('POSTED_LOCKED');
      updateRow_(entity, t._row, { isDeleted: true, updatedByName: user.fullName || user.username, updatedAt: new Date() });
      return true;
    }
    if (entity === 'Customers') {
      assertCustomerVisible_(user, id);
      const used = readTable('Transactions').some(function (t) { return t.account === id && !t.isDeleted; });
      if (used) throw new Error('HAS_TRANSACTIONS');
    }
    if (entity === 'CustomerGroups' && readTable('Customers').some(function (c) { return c.group === id; })) {
      throw new Error('IN_USE');
    }
    if (entity === 'Users') {
      if (!user.isAdmin) throw new Error('NO_PERMISSION');
      if (id === user.userId) throw new Error('CANNOT_DELETE_SELF');
    }
    if (entity === 'Currencies' && String(id).toUpperCase() === String(getSettings_().ReportCurrency || '').toUpperCase()) {
      throw new Error('IN_USE');
    }
    const rowNum = findRow_(entity, id);
    if (rowNum < 0) throw new Error('NOT_FOUND');
    invalidate_();
    sheet_(entity).deleteRow(rowNum);
    return true;
  });
}

/** Post (ترحيل) or un-post draft transactions. Only posted rows affect balances & reports. */
function postTransactions(token, ids, unpost) {
  const user = auth_(token);
  if (!user.isAdmin && user.pageList.indexOf('transactions') === -1 && user.pageList.indexOf('receipts') === -1) throw new Error('NO_PERMISSION');
  requireAction_(user, 'post');
  if (unpost && !user.isAdmin) throw new Error('NO_PERMISSION');
  return withLock_(function () {
    const set = {};
    ids.forEach(function (id) { set[id] = true; });
    const sh = sheet_('Transactions');
    const hm = headerMap_(sh);
    const idx = fieldIndex_('Transactions', hm);
    const last = sh.getLastRow();
    if (last < 2) return 0;
    const range = sh.getRange(2, 1, last - 1, hm.headers.length);
    const values = range.getValues();
    const allowed = {};
    visibleCustomers_(user).forEach(function (c) { allowed[c.account] = true; });
    let n = 0;
    const now = new Date(), who = user.fullName || user.username;
    const told = {};
    values.forEach(function (row) {
      if (!set[String(row[idx.rowId])] || !allowed[String(row[idx.account]).trim()]) return;
      row[idx.postStatus] = unpost ? 'Draft' : 'Posted';
      row[idx.postedBy] = unpost ? '' : who;
      row[idx.postedAt] = unpost ? '' : now;
      const by = idx.collectedBy !== undefined ? String(row[idx.collectedBy] || '') : '';
      if (!unpost && by && by !== user.username) (told[by] = told[by] || []).push(String(row[idx.voucher]));
      n++;
    });
    range.setValues(values);
    Object.keys(told).forEach(function (u) {
      notify_([u], 'RECEIPT_POSTED', told[u].join(', ') + ' — ' + who, '');
    });
    return n;
  });
}

// ───────────────────────────── Import ─────────────────────────────
/**
 * Import rows parsed client-side (Excel/CSV from Dynamics 365).
 * rows: array of objects keyed by the file's headers. mode: 'append' | 'replace' | 'upsert'.
 */
function importRows(token, entity, rows, mode) {
  const user = auth_(token, 'import');
  requireAction_(user, 'add');
  if (mode === 'replace') requireAction_(user, 'delete');
  if (['Customers', 'Transactions', 'CustomerGroups', 'Currencies'].indexOf(entity) === -1) throw new Error('Unknown entity');
  const norm = function (s) { return String(s).toLowerCase().replace(/[^a-z0-9؀-ۿ]/g, ''); };
  const aliases = {
    account: ['customeraccount', 'account', 'custaccount', 'accountnum', 'رقمالعميل'],
    name: ['name', 'customername', 'اسمالعميل'],
    group: ['customergroup', 'group', 'custgroup', 'groupid'],
    phone: ['contactnumber', 'phone', 'telephone', 'primarycontactphone'],
    email: ['email', 'primarycontactemail', 'emailaddress'],
    type: ['transactiontype', 'transtype', 'type'],
    amountCur: ['amountintransactioncurrency', 'amountcur', 'amount'],
    exchange: ['excange', 'exchange', 'exchangerate', 'exchrate'],
    creditMST: ['creditinlocalcurrency', 'creditmst', 'credit'],
    debitMST: ['debitinlocalcurrency', 'debitmst', 'debit'],
    createdAt: ['createddateandtime', 'createdat', 'createddatetime'],
    dueDate: ['duedate', 'due'],
    groupName: ['groupname', 'description']
  };
  const fieldFor = {};
  SCHEMA[entity].forEach(function (f) {
    fieldFor[norm(f[1])] = f[0];
    fieldFor[norm(f[0])] = f[0];
    (aliases[f[0]] || []).forEach(function (a) { if (!fieldFor[a]) fieldFor[a] = f[0]; });
  });
  const now = new Date(), who = user.fullName || user.username;
  const mapped = rows.map(function (src) {
    const o = {};
    Object.keys(src).forEach(function (h) {
      const n = norm(h);
      let k = fieldFor[n];
      if (!k) { // e.g. "Amount in transaction currency (- if Debit /+ if Credit)"
        const hit = Object.keys(fieldFor).filter(function (a) { return a.length >= 6 && n.indexOf(a) === 0; })
          .sort(function (a, b) { return b.length - a.length; })[0];
        k = hit && fieldFor[hit];
      }
      if (k && (o[k] === undefined || o[k] === '')) o[k] = src[h];
    });
    return o;
  }).filter(function (o) { return o[ID_FIELD[entity]] || (entity === 'Transactions' && o.account); });

  mapped.forEach(function (o) {
    if (entity === 'Transactions') {
      o.rowId = o.rowId || Utilities.getUuid();
      o.isDeleted = toBool_(o.isDeleted);
      o.postStatus = o.postStatus || 'Posted'; // data coming from D365 is already posted
      o.createdByName = o.createdByName || who;
      o.createdAt = o.createdAt || now;
      // Derive debit / credit from the signed amount when local columns are empty.
      if (!toNum_(o.debitMST) && !toNum_(o.creditMST) && o.amountCur !== undefined) {
        const amt = toNum_(o.amountCur) * (toNum_(o.exchange) || 1);
        if (amt < 0) o.debitMST = -amt; else o.creditMST = amt;
      }
      // A negative debit is really a credit (and vice versa).
      let d = toNum_(o.debitMST), c = toNum_(o.creditMST);
      if (d < 0) { c -= d; d = 0; }
      if (c < 0) { d -= c; c = 0; }
      o.debitMST = d; o.creditMST = c;
      if (o.currency) o.currency = String(o.currency).trim().toUpperCase();
    }
    if (entity === 'Customers') {
      o.status = o.status || 'Active';
      o.updatedBy = who; o.updatedAt = now;
    }
  });

  return withLock_(function () {
    const sh = sheet_(entity);
    if (mode === 'replace' && sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
    let inserted = 0, updated = 0;
    if (mode === 'upsert' && entity !== 'Transactions' && sh.getLastRow() > 1) {
      // One read + one write for the whole batch (fast for thousands of customers).
      const hm = headerMap_(sh), idx = fieldIndex_(entity, hm);
      const range = sh.getRange(2, 1, sh.getLastRow() - 1, hm.headers.length);
      const values = range.getValues();
      const pos = {};
      values.forEach(function (row, i) { pos[String(row[idx[ID_FIELD[entity]]]).trim()] = i; });
      const fresh = [];
      mapped.forEach(function (o) {
        const i = pos[String(o[ID_FIELD[entity]]).trim()];
        if (i === undefined) { fresh.push(o); return; }
        for (const k in o) if (idx[k] !== undefined && o[k] !== '' && o[k] !== undefined) values[i][idx[k]] = toSheetValue_(k, o[k]);
        updated++;
      });
      range.setValues(values);
      appendRows(entity, fresh); inserted = fresh.length;
    } else {
      appendRows(entity, mapped); inserted = mapped.length;
    }
    return { inserted: inserted, updated: updated, skipped: rows.length - mapped.length };
  });
}

/** Fills row_id for transaction rows pasted straight into the sheet so they can be edited. */
function ensureRowIds_() {
  const sh = sheet_('Transactions');
  const last = sh.getLastRow();
  if (last < 2) return;
  const col = fieldIndex_('Transactions', headerMap_(sh)).rowId + 1;
  const range = sh.getRange(2, col, last - 1, 1);
  const ids = range.getValues();
  let changed = false;
  ids.forEach(function (r) { if (!r[0]) { r[0] = Utilities.getUuid(); changed = true; } });
  if (changed) withLock_(function () { range.setValues(ids); });
}

function getTemplateHeaders(token, entity) {
  auth_(token, 'import');
  const system = ['rowId', 'createdById', 'createdAt', 'updatedByName', 'updatedAt', 'postStatus', 'postedBy', 'postedAt', 'updatedBy'];
  return SCHEMA[entity].filter(function (f) { return system.indexOf(f[0]) === -1; }).map(function (f) { return f[1]; });
}

function saveSettings(token, values) {
  const user = auth_(token, 'users');
  if (!user.isAdmin) throw new Error('NO_PERMISSION');
  if (values.CompanyLogo !== undefined) { // small data:image URL that fits in one sheet cell
    const v = String(values.CompanyLogo || '');
    if (v && (!/^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,/.test(v) || v.length > 49000)) throw new Error('LOGO_INVALID');
  }
  return withLock_(function () {
    const rows = readTable('Settings');
    Object.keys(values).forEach(function (k) {
      const r = rows.filter(function (x) { return x.key === k; })[0];
      if (r) updateRow_('Settings', r._row, { value: values[k] });
      else appendRows('Settings', [{ key: k, value: values[k] }]);
    });
    return getSettings_();
  });
}

// ───────────────────────────── Currencies ─────────────────────────────
/**
 * Currency converter. Rates in the Currencies sheet = value of 1 unit in the
 * reporting (base) currency, so the base currency always has rate 1.
 * `display` = currency the numbers are shown in (defaults to the base).
 */
function fx_(display) {
  const s = getSettings_();
  const local = String(s.LocalCurrency || '').trim().toUpperCase();
  const base = String(s.ReportCurrency || local).trim().toUpperCase();
  const rates = {};
  readTable('Currencies').forEach(function (c) { if (c.code && c.rate > 0) rates[String(c.code).toUpperCase()] = c.rate; });
  if (base) rates[base] = 1;
  const disp = String(display || base).trim().toUpperCase();
  const missing = {};
  function rate(c) {
    c = String(c || local).trim().toUpperCase();
    if (rates[c]) return rates[c];
    missing[c] = true;
    return 1;
  }
  const fx = {
    local: local, base: base, display: disp, basis: s.ConversionBasis || 'local', missing: missing, rate: rate,
    /** amount in currency c → display currency */
    conv: function (a, c) { c = String(c || local).trim().toUpperCase(); return !a || c === disp ? a : a * rate(c) / rate(disp); },
    /** amount in display currency → currency c */
    to: function (a, c) { c = String(c || local).trim().toUpperCase(); return !a || c === disp ? a : a * rate(disp) / rate(c); }
  };
  fx.fromLocal = function (a) { return fx.conv(a, local); };
  return fx;
}

/** Debit / credit of a transaction in the display currency. Negative D365 amounts flip side. */
function txAmounts_(t, fx) {
  let dr = +t.debitMST || 0, cr = +t.creditMST || 0;
  if (dr < 0) { cr -= dr; dr = 0; }
  if (cr < 0) { dr -= cr; cr = 0; }
  if (fx.basis === 'transaction' && +t.amountCur && t.currency) {
    const isDebit = (dr || cr) ? dr > cr : +t.amountCur < 0;
    const v = fx.conv(Math.abs(+t.amountCur), t.currency);
    return isDebit ? { dr: v, cr: 0 } : { dr: 0, cr: v };
  }
  return { dr: fx.fromLocal(dr), cr: fx.fromLocal(cr) };
}

function fxInfo_(fx) {
  return { currency: fx.display, base: fx.base, local: fx.local, missingRates: Object.keys(fx.missing) };
}

/** Currencies used in customers / transactions that have no rate yet. */
function getCurrencyStatus(token) {
  auth_(token, 'currencies');
  const s = getSettings_();
  const base = String(s.ReportCurrency || s.LocalCurrency || '').toUpperCase();
  const known = {};
  readTable('Currencies').forEach(function (c) { if (c.rate > 0) known[String(c.code).toUpperCase()] = true; });
  known[base] = true;
  const used = {};
  readTable('Customers').forEach(function (c) { if (c.currency) used[String(c.currency).toUpperCase()] = true; });
  readTable('Transactions').forEach(function (t) { if (t.currency) used[String(t.currency).toUpperCase()] = true; });
  if (s.LocalCurrency) used[String(s.LocalCurrency).toUpperCase()] = true;
  return {
    settings: { ReportCurrency: s.ReportCurrency || '', LocalCurrency: s.LocalCurrency || '', ConversionBasis: s.ConversionBasis || 'local' },
    missing: Object.keys(used).filter(function (c) { return !known[c]; })
  };
}

/** Saves reporting / local currency. Changing the reporting currency re-bases every rate. */
function saveCurrencySettings(token, vals) {
  const user = auth_(token, 'currencies');
  requireAction_(user, 'edit');
  return withLock_(function () {
    const s = getSettings_();
    const oldBase = String(s.ReportCurrency || s.LocalCurrency || '').toUpperCase();
    const newBase = String(vals.ReportCurrency || '').trim().toUpperCase();
    const cur = readTable('Currencies');
    if (newBase && newBase !== oldBase) {
      const nb = cur.filter(function (c) { return String(c.code).toUpperCase() === newBase; })[0];
      const factor = nb && nb.rate > 0 ? nb.rate : 0;
      if (!factor) throw new Error('RATE_REQUIRED');
      cur.forEach(function (c) { if (c.rate > 0) updateRow_('Currencies', c._row, { rate: c.rate / factor, updatedAt: new Date() }); });
      if (oldBase && !cur.some(function (c) { return String(c.code).toUpperCase() === oldBase; })) {
        appendRows('Currencies', [{ code: oldBase, name: oldBase, rate: 1 / factor, active: true, updatedAt: new Date() }]);
      }
    }
    const rows = readTable('Settings');
    ['ReportCurrency', 'LocalCurrency', 'ConversionBasis'].forEach(function (k) {
      if (vals[k] === undefined) return;
      const v = k === 'ConversionBasis' ? vals[k] : String(vals[k]).trim().toUpperCase();
      const r = rows.filter(function (x) { return x.key === k; })[0];
      if (r) updateRow_('Settings', r._row, { value: v }); else appendRows('Settings', [{ key: k, value: v }]);
    });
    return getSettings_();
  });
}

// ───────────────────────────── Collections (receipts ↔ invoices) ─────────────────────────────
/** paymentRowId → [{invoiceVoucher, amount}] */
function allocationsByPayment_() {
  if (MEMO.alloc) return MEMO.alloc;
  const out = {};
  readTable('Allocations').forEach(function (a) { (out[a.paymentRowId] = out[a.paymentRowId] || []).push(a); });
  return (MEMO.alloc = out);
}

/** Open (unpaid) invoices of a customer in local currency, minus amounts held by draft receipts. */
function openInvoices_(user, account, excludeRowId) {
  const L = ledger_(user, '9999-12-31', getSettings_().LocalCurrency);
  const drafts = {};
  readTable('Transactions').forEach(function (t) {
    if (t.account === account && !t.isDeleted && t.postStatus === 'Draft' && t.rowId !== excludeRowId) drafts[t.rowId] = true;
  });
  const pending = {};
  readTable('Allocations').forEach(function (a) {
    if (drafts[a.paymentRowId]) pending[a.invoiceVoucher] = round2_((pending[a.invoiceVoucher] || 0) + a.amount);
  });
  const today = today_();
  const rows = [];
  L.invoices.filter(function (i) { return i.account === account && i.remaining > 0.005; }).forEach(function (i) {
    const hold = Math.min(pending[i.voucher] || 0, i.remaining);
    if (hold) pending[i.voucher] = round2_(pending[i.voucher] - hold);
    const left = round2_(i.remaining - hold);
    if (left > 0.005) rows.push({ voucher: i.voucher, date: i.date, dueDate: i.dueDate, amount: i.amount, remaining: left,
      pending: hold, days: Math.max(0, daysBetween_(i.dueDate, today)) });
  });
  return { invoices: rows, currency: L.fx.local, customer: L.cmap[account] };
}

function getOpenInvoices(token, account, excludeRowId) {
  const user = auth_(token, 'receipts');
  assertCustomerVisible_(user, account);
  return openInvoices_(user, account, excludeRowId || '');
}

/** Removes the invoice links of a receipt (used when the receipt is edited). */
function deleteAllocations_(rowId) {
  const sh = sheet_('Allocations');
  const last = sh.getLastRow();
  if (last < 2) return;
  const hm = headerMap_(sh), idx = fieldIndex_('Allocations', hm);
  const range = sh.getRange(2, 1, last - 1, hm.headers.length);
  const values = range.getValues();
  const keep = values.filter(function (row) { return String(row[idx.paymentRowId]) !== String(rowId); });
  if (keep.length === values.length) return;
  invalidate_();
  range.clearContent();
  if (keep.length) sh.getRange(2, 1, keep.length, hm.headers.length).setValues(keep);
}

function nextReceiptNo_() {
  const rows = readTable('Settings');
  const r = rows.filter(function (x) { return x.key === 'ReceiptSeq'; })[0];
  const n = (r ? +r.value || 0 : 0) + 1;
  if (r) updateRow_('Settings', r._row, { value: n }); else appendRows('Settings', [{ key: 'ReceiptSeq', value: n }]);
  return 'RC-' + ('00000' + n).slice(-6);
}

/**
 * Records a collection: one payment transaction (credit) + links to the invoices it pays.
 * r: {account, date, voucher?, payMethod, chequeNo, chequeDate, bankName, payRef, currency, exchange,
 *     description, post, onAccount, allocations: [{voucher, amount}]}  — amounts in local currency.
 */
function saveReceipt(token, r) {
  const user = auth_(token, 'receipts');
  const editing = !!r.rowId;
  requireAction_(user, editing ? 'edit' : 'add');
  assertCustomerVisible_(user, r.account);
  if (PAY_METHODS.indexOf(r.payMethod) === -1) throw new Error('REQUIRED_FIELDS');
  if (r.payMethod === 'Cheque' && !String(r.chequeNo || '').trim()) throw new Error('CHEQUE_REQUIRED');
  if (!r.date) throw new Error('REQUIRED_FIELDS');
  const allocs = (r.allocations || []).map(function (a) { return { voucher: String(a.voucher), amount: round2_(toNum_(a.amount)) }; })
    .filter(function (a) { return a.voucher && a.amount > 0; });
  const onAccount = round2_(Math.max(0, toNum_(r.onAccount)));
  return withLock_(function () {
    let existing = null;
    if (editing) { // only unposted receipts can be changed
      existing = getById_('Transactions', r.rowId);
      if (existing.isDeleted || !existing.payMethod) throw new Error('NOT_FOUND');
      if (existing.postStatus !== 'Draft') throw new Error('POSTED_LOCKED');
      assertCustomerVisible_(user, existing.account);
    }
    const open = openInvoices_(user, r.account, editing ? r.rowId : '');
    if (!allocs.length && !(onAccount > 0 && !open.invoices.length)) throw new Error('INVOICE_REQUIRED');
    const left = {};
    open.invoices.forEach(function (i) { left[i.voucher] = round2_((left[i.voucher] || 0) + i.remaining); });
    allocs.forEach(function (a) {
      if (left[a.voucher] === undefined || a.amount > left[a.voucher] + 0.01) throw new Error('OVER_ALLOCATED: ' + a.voucher);
      left[a.voucher] = round2_(left[a.voucher] - a.amount);
    });
    const total = round2_(allocs.reduce(function (s, a) { return s + a.amount; }, 0) + onAccount);
    const voucher = String(r.voucher || '').trim() || (existing ? existing.voucher : nextReceiptNo_());
    if (readTable('Transactions').some(function (t) { return !t.isDeleted && t.payMethod && String(t.voucher) === voucher && t.rowId !== r.rowId; })) throw new Error('DUPLICATE_ID');
    const now = new Date(), who = user.fullName || user.username;
    const exchange = toNum_(r.exchange) || 1;
    const post = !!r.post && (user.isAdmin || user.canPost);
    const tx = {
      voucher: voucher, type: 'Payment', account: r.account, date: r.date, description: r.description || ('Collection - ' + r.payMethod),
      amountCur: round2_(total / exchange), currency: String(r.currency || open.currency || '').toUpperCase(), exchange: exchange,
      creditMST: total, debitMST: 0, userAdd: user.username, createdById: user.userId, createdByName: who, createdAt: now,
      updatedByName: who, updatedAt: now, isDeleted: false, postStatus: post ? 'Posted' : 'Draft',
      postedBy: post ? who : '', postedAt: post ? now : '', rowId: Utilities.getUuid(),
      payMethod: r.payMethod, chequeNo: r.chequeNo || '', chequeDate: r.chequeDate || '', bankName: r.bankName || '',
      payRef: r.payRef || '', collectedBy: user.username
    };
    if (existing) { // keep identity and audit fields, replace the rest and the invoice links
      ['rowId', 'userAdd', 'createdById', 'createdByName', 'createdAt', 'collectedBy'].forEach(function (k) { tx[k] = existing[k]; });
      updateRow_('Transactions', existing._row, tx);
      deleteAllocations_(tx.rowId);
    } else {
      appendRows('Transactions', [tx]);
    }
    appendRows('Allocations', allocs.map(function (a) {
      return { id: Utilities.getUuid(), paymentRowId: tx.rowId, paymentVoucher: voucher, account: r.account,
        invoiceVoucher: a.voucher, amount: a.amount, date: r.date, createdBy: who, createdAt: now };
    }));
    if (!post && !existing) {
      const posters = readTable('Users').filter(function (u) {
        return u.active && u.username !== user.username && (u.role === 'Admin' || u.canPost);
      }).map(function (u) { return u.username; });
      notify_(posters, 'RECEIPT_PENDING', voucher + ' — ' + fmtInt_(total) + ' — ' + who, r.account);
    }
    return { rowId: tx.rowId, voucher: voucher, total: total, postStatus: tx.postStatus };
  });
}

/** Everything needed to print a receipt voucher. */
function getReceipt(token, rowId) {
  const user = auth_(token, 'receipts');
  const t = getById_('Transactions', rowId);
  assertCustomerVisible_(user, t.account);
  const c = visibleCustomers_(user).filter(function (x) { return x.account === t.account; })[0];
  return { tx: t, customer: c, allocations: allocationsByPayment_()[rowId] || [], settings: publicSettings_() };
}

function publicSettings_() {
  const s = getSettings_();
  const out = {};
  ['AppName', 'CompanyName', 'CompanyAddress', 'CompanyPhone', 'CompanyEmail', 'BankDetails', 'StatementNote',
    'WhatsAppCountryCode', 'LocalCurrency', 'ReportCurrency', 'CompanyLogo'].forEach(function (k) { out[k] = s[k] || ''; });
  return out;
}

// ───────────────────────────── Statement sending ─────────────────────────────
function pdfFromHtml_(html, name) {
  return Utilities.newBlob(html, 'text/html', 'statement.html').getAs('application/pdf').setName(name.replace(/[\\/:*?"<>|]/g, '_') + '.pdf');
}

function logContact_(user, account, type, note) {
  appendRows('FollowUps', [{ id: Utilities.getUuid(), account: account, actionDate: new Date(), actionType: type, note: note,
    status: 'Done', createdBy: user.fullName || user.username, createdAt: new Date() }]);
}

/** Emails the statement (PDF attachment built from the page's printable HTML). */
function sendStatementEmail(token, account, o) {
  const user = auth_(token, 'statement');
  assertCustomerVisible_(user, account);
  const to = String(o.to || '').trim();
  if (!to) throw new Error('EMAIL_REQUIRED');
  const s = getSettings_();
  const esc = function (v) { return String(v || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  const mail = {
    to: to, subject: o.subject || 'Statement of account', name: s.CompanyName || s.AppName || 'CRM',
    htmlBody: '<div dir="' + (o.rtl ? 'rtl' : 'ltr') + '" style="font-family:Tahoma,Arial,sans-serif;font-size:14px;line-height:1.7">' +
      esc(o.message).replace(/\n/g, '<br>') + '</div>',
    attachments: [pdfFromHtml_(o.html, o.fileName || ('Statement_' + account))]
  };
  if (o.cc) mail.cc = o.cc;
  if (s.CompanyEmail) mail.replyTo = s.CompanyEmail;
  MailApp.sendEmail(mail);
  withLock_(function () { logContact_(user, account, 'Email', 'Statement sent to ' + to); });
  return { quota: MailApp.getRemainingDailyQuota() };
}

/** Saves the statement PDF to Drive ("CRM Statements") and returns a view link for WhatsApp. */
function statementPdfLink(token, account, o) {
  const user = auth_(token, 'statement');
  assertCustomerVisible_(user, account);
  const it = DriveApp.getFoldersByName('CRM Statements');
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder('CRM Statements');
  const file = folder.createFile(pdfFromHtml_(o.html, o.fileName || ('Statement_' + account)));
  let shared = true;
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { shared = false; }
  return { url: file.getUrl(), shared: shared };
}

/** Logs a WhatsApp (or other) contact in the follow-up log. */
function logContact(token, account, type, note) {
  const user = auth_(token, 'statement');
  assertCustomerVisible_(user, account);
  withLock_(function () { logContact_(user, account, type, note); });
  return true;
}

// ───────────────────────────── Messages & notifications ─────────────────────────────
function listHas_(csv, v) { return String(csv || '').split(',').map(function (x) { return x.trim(); }).indexOf(v) > -1; }
function msgToMe_(m, u) { return m.to === 'ALL' || listHas_(m.to, u); }
function msgVisible_(m, u) { return !listHas_(m.deletedBy, u) && (m.from === u || msgToMe_(m, u)); }

/** System notification (from "system"); subject is a code the client translates. */
function notify_(users, subject, body, account) {
  users = (users || []).filter(String);
  if (!users.length) return;
  appendRows('Messages', [{ id: Utilities.getUuid(), from: 'system', to: users.join(','), subject: subject, body: body || '',
    type: 'notification', account: account || '', replyTo: '', createdAt: new Date(), readBy: '', deletedBy: '' }]);
}

/** Payment promises due (today or earlier) on customers this user follows — computed live. */
function promiseAlerts_(user) {
  const today = today_();
  const mine = {};
  visibleCustomers_(user).forEach(function (c) { if (user.isAdmin || c.collector === user.username || user.scope !== 'own') mine[c.account] = c.name; });
  const own = {};
  visibleCustomers_(user).forEach(function (c) { if (c.collector === user.username) own[c.account] = true; });
  const hasOwn = Object.keys(own).length > 0;
  return readTable('FollowUps').filter(function (f) {
    return f.status === 'Open' && f.promiseDate && f.promiseDate <= today && mine[f.account] !== undefined && (!hasOwn || own[f.account]);
  }).map(function (f) {
    return { id: 'promise_' + f.id, from: 'system', subject: 'PROMISE_DUE', body: f.promiseDate + ' — ' + fmtInt_(f.promiseAmount) + (f.note ? ' — ' + f.note : ''),
      account: f.account, customerName: mine[f.account], type: 'alert', createdAt: f.promiseDate, unread: true };
  });
}

/** box: inbox | sent | alerts */
function getMessages(token, box) {
  const user = auth_(token);
  const u = user.username;
  const names = { system: 'system' };
  readTable('Users').forEach(function (x) { names[x.username] = x.fullName || x.username; });
  const cust = {};
  readTable('Customers').forEach(function (c) { cust[c.account] = c.name; });
  let rows = readTable('Messages').filter(function (m) { return msgVisible_(m, u); });
  if (box === 'sent') rows = rows.filter(function (m) { return m.from === u; });
  else if (box === 'alerts') rows = rows.filter(function (m) { return m.type === 'notification' && msgToMe_(m, u); });
  else rows = rows.filter(function (m) { return m.type !== 'notification' && m.from !== u && msgToMe_(m, u); });
  rows = rows.map(function (m) {
    return { id: m.id, from: m.from, fromName: names[m.from] || m.from, to: m.to,
      toName: m.to === 'ALL' ? 'ALL' : m.to.split(',').map(function (x) { return names[x.trim()] || x; }).join('، '),
      subject: m.subject, body: m.body, type: m.type, account: m.account, customerName: cust[m.account] || '',
      replyTo: m.replyTo, createdAt: m.createdAt, unread: m.from !== u && !listHas_(m.readBy, u) };
  });
  if (box === 'alerts') rows = promiseAlerts_(user).concat(rows);
  rows.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  return rows.slice(0, 500);
}

/** Whole conversation for a message; marks it read for the current user. */
function getThread(token, id) {
  const user = auth_(token);
  const u = user.username;
  const all = readTable('Messages');
  const msg = all.filter(function (m) { return m.id === id; })[0];
  if (!msg || !msgVisible_(msg, u)) throw new Error('NOT_FOUND');
  const root = msg.replyTo || msg.id;
  const names = { system: 'system' };
  readTable('Users').forEach(function (x) { names[x.username] = x.fullName || x.username; });
  const thread = all.filter(function (m) { return (m.id === root || m.replyTo === root) && msgVisible_(m, u); })
    .sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; })
    .map(function (m) { return { id: m.id, from: m.from, fromName: names[m.from] || m.from, to: m.to, subject: m.subject, body: m.body,
      type: m.type, account: m.account, createdAt: m.createdAt, mine: m.from === u }; });
  markRead_(u, thread.map(function (m) { return m.id; }));
  const c = readTable('Customers').filter(function (x) { return x.account === (thread[0] && thread[0].account); })[0];
  return { root: root, thread: thread, customerName: c ? c.name : '' };
}

/** Patches many message rows with one read + one write. */
function patchMessages_(fn) {
  withLock_(function () {
    const sh = sheet_('Messages');
    const last = sh.getLastRow();
    if (last < 2) return;
    const hm = headerMap_(sh), idx = fieldIndex_('Messages', hm);
    const range = sh.getRange(2, 1, last - 1, hm.headers.length);
    const values = range.getValues();
    let changed = false;
    values.forEach(function (row) { if (fn(row, idx)) changed = true; });
    if (changed) range.setValues(values);
  });
}

function markRead_(u, ids) {
  const set = {};
  ids.forEach(function (i) { set[i] = true; });
  patchMessages_(function (row, idx) {
    if (!set[String(row[idx.id])] || listHas_(row[idx.readBy], u)) return false;
    row[idx.readBy] = row[idx.readBy] ? row[idx.readBy] + ',' + u : u;
    return true;
  });
}

function markMessagesRead(token, ids) {
  const user = auth_(token);
  if (ids === 'ALL') ids = readTable('Messages').filter(function (m) { return msgToMe_(m, user.username); }).map(function (m) { return m.id; });
  markRead_(user.username, ids);
  return true;
}

function deleteMessage(token, id) {
  const u = auth_(token).username;
  patchMessages_(function (row, idx) {
    if (String(row[idx.id]) !== id || listHas_(row[idx.deletedBy], u)) return false;
    row[idx.deletedBy] = row[idx.deletedBy] ? row[idx.deletedBy] + ',' + u : u;
    return true;
  });
  return true;
}

/** m: {to: [usernames] | ['ALL'], subject, body, account, replyTo} */
function sendMessage(token, m) {
  const user = auth_(token);
  const u = user.username;
  const body = String(m.body || '').trim().slice(0, 5000);
  if (!body) throw new Error('REQUIRED_FIELDS');
  let to = (m.to || []).map(String).filter(String);
  let subject = String(m.subject || '').trim().slice(0, 200);
  let account = m.account || '';
  if (m.replyTo) { // reply goes to everyone in the conversation except me
    const all = readTable('Messages');
    const root = all.filter(function (x) { return x.id === m.replyTo; })[0];
    if (!root || !msgVisible_(root, u)) throw new Error('NOT_FOUND');
    const people = {};
    all.filter(function (x) { return x.id === root.id || x.replyTo === root.id; }).forEach(function (x) {
      people[x.from] = true;
      if (x.to === 'ALL') people.ALL = true; else x.to.split(',').forEach(function (p) { people[p.trim()] = true; });
    });
    delete people[u]; delete people.system;
    to = people.ALL ? ['ALL'] : Object.keys(people);
    subject = subject || ('Re: ' + root.subject);
    account = account || root.account;
  }
  if (!to.length) throw new Error('REQUIRED_FIELDS');
  if (to.indexOf('ALL') > -1) to = ['ALL'];
  const msg = { id: Utilities.getUuid(), from: u, to: to.join(','), subject: subject, body: body, type: 'message',
    account: account, replyTo: m.replyTo || '', createdAt: new Date(), readBy: u, deletedBy: '' };
  withLock_(function () { appendRows('Messages', [msg]); });
  return { id: msg.id };
}

/** Lightweight poll for the unread badge; does not extend an idle session. */
function getUnreadCount(token) {
  const user = auth_(token, null, true);
  const u = user.username;
  let messages = 0, alerts = 0;
  readTable('Messages').forEach(function (m) {
    if (m.from === u || !msgToMe_(m, u) || listHas_(m.readBy, u) || listHas_(m.deletedBy, u)) return;
    if (m.type === 'notification') alerts++; else messages++;
  });
  return { messages: messages, alerts: alerts + promiseAlerts_(user).length };
}

// ───────────────────────────── Ledger engine ─────────────────────────────
/**
 * Loads posted, non-deleted transactions for visible customers (amounts converted to
 * the display currency as t.dr / t.cr) and settles credits against debits FIFO
 * (oldest invoice first) to get open amounts, paid dates and aging.
 */
function ledger_(user, asOf, display) {
  const fx = fx_(display);
  const custs = visibleCustomers_(user);
  const cmap = {};
  custs.forEach(function (c) { cmap[c.account] = c; });
  const tx = [];
  readTable('Transactions').forEach(function (t0) {
    if (t0.isDeleted || t0.postStatus === 'Draft' || !cmap[t0.account] || !t0.date || (asOf && t0.date > asOf)) return;
    const t = Object.assign({}, t0);
    const a = txAmounts_(t, fx);
    t.dr = a.dr; t.cr = a.cr;
    tx.push(t);
  });
  const byCust = {};
  tx.forEach(function (t) { (byCust[t.account] = byCust[t.account] || []).push(t); });
  const links = allocationsByPayment_();
  const invoices = [];
  Object.keys(byCust).forEach(function (acc) {
    const list = byCust[acc].sort(function (a, b) {
      return a.date < b.date ? -1 : a.date > b.date ? 1 : (b.dr - a.dr);
    });
    const terms = +cmap[acc].termsDays || 0;
    const invs = [], credits = [];
    list.forEach(function (t) {
      const net = round2_(t.dr - t.cr);
      if (net > 0) {
        invs.push({
          account: acc, voucher: t.voucher, type: t.type, date: t.date, description: t.description,
          dueDate: t.dueDate || addDays_(t.date, terms), amount: net, remaining: net, paidDate: '', lastPaymentDate: '', payments: []
        });
      } else if (net < 0) credits.push({ t: t, total: -net, left: -net });
    });
    const apply = function (inv, c, a, linked) {
      a = round2_(a);
      if (a <= 0) return 0;
      inv.remaining = round2_(inv.remaining - a); c.left = round2_(c.left - a);
      const d = c.t.date > inv.date ? c.t.date : inv.date;
      if (d > inv.lastPaymentDate) inv.lastPaymentDate = d;
      inv.payments.push({ voucher: c.t.voucher, date: c.t.date, amount: a, method: c.t.payMethod || '', linked: linked });
      if (inv.remaining <= 0.005) { inv.remaining = 0; if (d > inv.paidDate) inv.paidDate = d; }
      return a;
    };
    // 1) Receipts linked to specific invoices (collection form).
    credits.forEach(function (c) {
      const al = links[c.t.rowId];
      if (!al) return;
      const localCr = Math.abs((+c.t.creditMST || 0) - (+c.t.debitMST || 0)) || c.total;
      al.forEach(function (a) {
        let amt = Math.min(c.left, a.amount * c.total / localCr);
        invs.forEach(function (inv) {
          if (amt > 0.005 && inv.remaining > 0.005 && String(inv.voucher) === String(a.invoiceVoucher)) {
            amt -= apply(inv, c, Math.min(amt, inv.remaining), true);
          }
        });
      });
    });
    // 2) Everything else: oldest invoice first (FIFO).
    credits.forEach(function (c) {
      invs.forEach(function (inv) {
        if (c.left > 0.005 && inv.remaining > 0.005) apply(inv, c, Math.min(c.left, inv.remaining), false);
      });
    });
    Array.prototype.push.apply(invoices, invs);
  });
  const balance = {};
  tx.forEach(function (t) { balance[t.account] = (balance[t.account] || 0) + t.dr - t.cr; });
  return { customers: custs, cmap: cmap, tx: tx, invoices: invoices, balance: balance, fx: fx };
}

/** Transactions of type "Opening balance" always feed the opening balance column. */
function isOpening_(t) { return /opening|افتتاح/i.test(String(t.type || '')); }

/** Payments = credit lines whose type looks like a payment; falls back to all credits. */
function paymentTest_(tx) {
  const re = /pay|receipt|دفع|سداد|تحصيل|قبض/i;
  const any = tx.some(function (t) { return t.cr > 0 && re.test(t.type); });
  return function (t) { return t.cr > 0 && (!any || re.test(t.type)); };
}

function addDays_(ymd, days) {
  const d = toDate_(ymd);
  d.setDate(d.getDate() + days);
  return Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
}

function daysBetween_(fromYmd, toYmd) {
  return Math.round((toDate_(toYmd) - toDate_(fromYmd)) / 86400000);
}

function today_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }

function customerFilter_(c, f) {
  if (!c) return false;
  if (f.group && c.group !== f.group) return false;
  if (f.collector && c.collector !== f.collector) return false;
  if (f.account && c.account !== f.account) return false;
  if (f.status && c.status !== f.status) return false;
  if (f.custCurrency && String(c.currency).toUpperCase() !== String(f.custCurrency).toUpperCase()) return false;
  return true;
}

function bucket_(days) {
  return days <= 30 ? 'b1' : days <= 60 ? 'b2' : days <= 90 ? 'b3' : 'b4';
}

// ───────────────────────────── Reports ─────────────────────────────
/** Opening balance, period debit/credit and closing balance per customer. */
function reportBalances(token, f) {
  const user = auth_(token, 'balances');
  f = f || {};
  const from = f.dateFrom || '1900-01-01', to = f.dateTo || today_();
  const L = ledger_(user, to, f.currency);
  const agg = {};
  L.tx.forEach(function (t) {
    const a = agg[t.account] = agg[t.account] || { opening: 0, debit: 0, credit: 0 };
    if (t.date < from || isOpening_(t)) a.opening += t.dr - t.cr;
    else { a.debit += t.dr; a.credit += t.cr; }
  });
  const rows = L.customers.filter(function (c) { return customerFilter_(c, f); }).map(function (c) {
    const a = agg[c.account] || { opening: 0, debit: 0, credit: 0 };
    return {
      account: c.account, name: c.name, group: c.group, collector: c.collector, custCurrency: c.currency,
      opening: round2_(a.opening), debit: round2_(a.debit), credit: round2_(a.credit),
      closing: round2_(a.opening + a.debit - a.credit)
    };
  }).filter(function (r) { return !f.hideZero || r.opening || r.debit || r.credit || r.closing; })
    .sort(function (a, b) { return b.closing - a.closing; });
  return Object.assign(fxInfo_(L.fx), {
    rows: rows, from: from, to: to,
    totals: { opening: sum_(rows, 'opening'), debit: sum_(rows, 'debit'), credit: sum_(rows, 'credit'), closing: sum_(rows, 'closing') }
  });
}

/** Customer statement of account with running balance. */
function customerStatement(token, account, dateFrom, dateTo, currency) {
  const user = auth_(token);
  const pages = ['customers', 'balances', 'paid', 'overdue', 'followup', 'collection', 'dashboard', 'credit', 'transactions', 'statement', 'receipts'];
  if (!pages.some(function (p) { return user.pageList.indexOf(p) > -1; })) throw new Error('NO_PERMISSION');
  assertCustomerVisible_(user, account);
  const from = dateFrom || '1900-01-01', to = dateTo || today_();
  const L = ledger_(user, to, currency || getSettings_().LocalCurrency);
  const cust = L.cmap[account];
  let opening = 0;
  const lines = [];
  L.tx.filter(function (t) { return t.account === account; })
    .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; })
    .forEach(function (t) {
      if (t.date < from || isOpening_(t)) { opening += t.dr - t.cr; return; }
      lines.push({ date: t.date, voucher: t.voucher, type: t.type, description: t.description, dueDate: t.dueDate,
        currency: t.currency, amountCur: t.amountCur, debit: round2_(t.dr), credit: round2_(t.cr),
        payMethod: t.payMethod || '', chequeNo: t.chequeNo || '', payRef: t.payRef || '' });
    });
  let run = opening;
  lines.forEach(function (l) { run = round2_(run + l.debit - l.credit); l.balance = run; });
  const today = to < today_() ? to : today_();
  const open = L.invoices.filter(function (i) { return i.account === account && i.remaining > 0; });
  const overdue = open.filter(function (i) { return i.dueDate < today; });
  const aging = { current: 0, b1: 0, b2: 0, b3: 0, b4: 0 };
  const openInvoices = open.map(function (i) {
    const days = Math.max(0, daysBetween_(i.dueDate, today));
    const k = i.dueDate < today ? bucket_(days) : 'current';
    aging[k] = round2_(aging[k] + i.remaining);
    return { voucher: i.voucher, date: i.date, dueDate: i.dueDate, amount: i.amount, paid: round2_(i.amount - i.remaining),
      remaining: i.remaining, days: i.dueDate < today ? days : 0,
      payments: i.payments.map(function (p) { return p.voucher; }).join('، ') };
  });
  return Object.assign(fxInfo_(L.fx), {
    customer: cust, from: dateFrom || '', to: to, opening: round2_(opening), closing: round2_(run), lines: lines,
    periodDebit: sum_(lines, 'debit'), periodCredit: sum_(lines, 'credit'),
    aging: aging, openInvoices: openInvoices, settings: publicSettings_(),
    openAmount: sum_(open, 'remaining'), overdueAmount: sum_(overdue, 'remaining'),
    maxDays: overdue.reduce(function (m, i) { return Math.max(m, daysBetween_(i.dueDate, today)); }, 0),
    followUps: readTable('FollowUps').filter(function (x) { return x.account === account; })
      .sort(function (a, b) { return a.actionDate < b.actionDate ? 1 : -1; }).slice(0, 20)
  });
}

/** Invoices fully settled within the period. */
function reportPaidInvoices(token, f) {
  const user = auth_(token, 'paid');
  f = f || {};
  const from = f.dateFrom || '1900-01-01', to = f.dateTo || today_();
  const L = ledger_(user, to, f.currency);
  const rows = L.invoices.filter(function (i) {
    return i.paidDate && i.paidDate >= from && i.paidDate <= to && customerFilter_(L.cmap[i.account], f);
  }).map(function (i) {
    const c = L.cmap[i.account];
    return {
      account: i.account, name: c.name, collector: c.collector, voucher: i.voucher, date: i.date,
      dueDate: i.dueDate, paidDate: i.paidDate, amount: i.amount,
      lateDays: Math.max(0, daysBetween_(i.dueDate, i.paidDate)),
      payVouchers: i.payments.map(function (p) { return p.voucher; }).join('، '),
      methods: i.payments.map(function (p) { return p.method; }).filter(function (m, k, a) { return m && a.indexOf(m) === k; }).join('، '),
      linked: i.payments.some(function (p) { return p.linked; })
    };
  }).sort(function (a, b) { return a.paidDate < b.paidDate ? 1 : -1; });
  const onTime = rows.filter(function (r) { return r.lateDays === 0; }).length;
  return Object.assign(fxInfo_(L.fx), { rows: rows, totals: { amount: sum_(rows, 'amount'), count: rows.length, onTime: onTime, late: rows.length - onTime } });
}

/** Open invoices past their expected collection (due) date. */
function reportOverdue(token, f) {
  const user = auth_(token, 'overdue');
  return overdue_(user, f || {});
}

function overdue_(user, f, L) {
  const asOf = f.asOf || today_();
  L = L || ledger_(user, asOf, f.currency);
  const minDays = +f.minDays || 1;
  const lastFollow = {};
  readTable('FollowUps').forEach(function (x) {
    if (!lastFollow[x.account] || x.actionDate > lastFollow[x.account].actionDate) lastFollow[x.account] = x;
  });
  const rows = L.invoices.filter(function (i) {
    return i.remaining > 0 && i.dueDate < asOf && customerFilter_(L.cmap[i.account], f);
  }).map(function (i) {
    const c = L.cmap[i.account];
    const days = daysBetween_(i.dueDate, asOf);
    return {
      account: i.account, name: c.name, group: c.group, collector: c.collector, phone: c.phone, email: c.email,
      voucher: i.voucher, date: i.date, dueDate: i.dueDate, amount: i.amount, remaining: i.remaining,
      days: days, bucket: bucket_(days), lastPaymentDate: i.lastPaymentDate,
      lastFollowUp: lastFollow[i.account] ? lastFollow[i.account].actionDate : '',
      promiseDate: lastFollow[i.account] ? lastFollow[i.account].promiseDate : ''
    };
  }).filter(function (r) { return r.days >= minDays && (!f.voucher || String(r.voucher).toLowerCase().indexOf(String(f.voucher).toLowerCase()) > -1); })
    .sort(function (a, b) { return b.days - a.days; });
  const buckets = { b1: 0, b2: 0, b3: 0, b4: 0 };
  rows.forEach(function (r) { buckets[r.bucket] = round2_(buckets[r.bucket] + r.remaining); });
  const byCust = {};
  rows.forEach(function (r) {
    const s = byCust[r.account] = byCust[r.account] || {
      account: r.account, name: r.name, collector: r.collector, phone: r.phone, email: r.email,
      count: 0, remaining: 0, maxDays: 0, lastFollowUp: r.lastFollowUp, promiseDate: r.promiseDate
    };
    s.count++; s.remaining = round2_(s.remaining + r.remaining); s.maxDays = Math.max(s.maxDays, r.days);
  });
  const customers = Object.keys(byCust).map(function (k) { return byCust[k]; })
    .sort(function (a, b) { return b.remaining - a.remaining; });
  return Object.assign(fxInfo_(L.fx), {
    asOf: asOf, rows: rows, customers: customers, buckets: buckets,
    totals: { remaining: sum_(rows, 'remaining'), count: rows.length, customers: customers.length,
      avgDays: rows.length ? Math.round(rows.reduce(function (s, r) { return s + r.days; }, 0) / rows.length) : 0 }
  });
}

/** Follow-up page: overdue customers + promises due. */
function getFollowUpBoard(token, f) {
  const user = auth_(token, 'followup');
  const od = overdue_(user, f || {});
  const today = today_();
  const due = readTable('FollowUps').filter(function (x) { return x.status === 'Open' && x.promiseDate && x.promiseDate <= today; });
  return Object.assign(fxInfo_(fx_(f && f.currency)), { customers: od.customers, totals: od.totals, promisesDue: due.length });
}

/** Collection team dashboard: per collector → companies, overdue, days late. */
function reportCollection(token, f) {
  const user = auth_(token, 'collection');
  f = f || {};
  const asOf = f.asOf || today_();
  const L = ledger_(user, asOf, f.currency);
  const od = overdue_(user, { asOf: asOf, group: f.group }, L);
  const users = {};
  readTable('Users').forEach(function (u) { users[u.username] = u.fullName || u.username; });
  const monthStart = asOf.slice(0, 8) + '01';
  const isPay = paymentTest_(L.tx);
  const collected = {};
  L.tx.forEach(function (t) { if (t.date >= monthStart && isPay(t)) collected[t.account] = (collected[t.account] || 0) + t.cr; });
  const team = {};
  L.customers.filter(function (c) { return !f.group || c.group === f.group; }).forEach(function (c) {
    const key = c.collector || '';
    const m = team[key] = team[key] || {
      collector: key, name: key ? (users[key] || key) : '', customers: 0, balance: 0, overdue: 0,
      overdueInvoices: 0, overdueCustomers: 0, maxDays: 0, sumDays: 0, collectedMTD: 0, companies: []
    };
    m.customers++;
    m.balance = round2_(m.balance + (L.balance[c.account] || 0));
    m.collectedMTD = round2_(m.collectedMTD + (collected[c.account] || 0));
  });
  od.customers.forEach(function (oc) {
    const m = team[oc.collector || ''];
    if (!m) return;
    m.overdue = round2_(m.overdue + oc.remaining);
    m.overdueInvoices += oc.count;
    m.overdueCustomers++;
    m.maxDays = Math.max(m.maxDays, oc.maxDays);
    m.companies.push({ account: oc.account, name: oc.name, remaining: oc.remaining, maxDays: oc.maxDays, count: oc.count,
      lastFollowUp: oc.lastFollowUp, balance: round2_(L.balance[oc.account] || 0) });
  });
  od.rows.forEach(function (r) { const m = team[r.collector || '']; if (m) m.sumDays += r.days; });
  const rows = Object.keys(team).map(function (k) {
    const m = team[k];
    m.avgDays = m.overdueInvoices ? Math.round(m.sumDays / m.overdueInvoices) : 0;
    m.companies.sort(function (a, b) { return b.maxDays - a.maxDays; });
    delete m.sumDays;
    return m;
  }).filter(function (m) { return !f.collector || m.collector === f.collector; })
    .sort(function (a, b) { return b.overdue - a.overdue; });
  return Object.assign(fxInfo_(L.fx), { rows: rows, buckets: od.buckets,
    totals: { overdue: sum_(rows, 'overdue'), balance: sum_(rows, 'balance'), collectedMTD: sum_(rows, 'collectedMTD') } });
}

/** Customers whose balance (in the customer's own currency) exceeds the credit limit. */
function reportCreditLimit(token, f) {
  const user = auth_(token, 'credit');
  f = f || {};
  const asOf = f.asOf || today_();
  // Work from local-currency amounts (exact for local-currency customers, one conversion for others).
  const L = ledger_(user, asOf, getSettings_().LocalCurrency);
  const fb = fx_();
  const od = overdue_(user, { asOf: asOf }, L);
  const odMap = {};
  od.customers.forEach(function (c) { odMap[c.account] = c; });
  const threshold = f.threshold === '' || f.threshold === undefined ? 100 : +f.threshold;
  const rows = L.customers.filter(function (c) { return customerFilter_(c, f) && (+c.creditLimit > 0 || f.includeNoLimit); }).map(function (c) {
    const ccy = String(c.currency || L.fx.local).toUpperCase();
    const bal = round2_(L.fx.to(L.balance[c.account] || 0, ccy));
    const limit = +c.creditLimit || 0;
    const o = odMap[c.account];
    return {
      account: c.account, name: c.name, group: c.group, collector: c.collector, currency: ccy, creditLimit: limit,
      balance: bal, excess: round2_(Math.max(0, bal - limit)), available: round2_(limit - bal),
      pct: limit ? Math.round(bal / limit * 100) : (bal > 0 ? 999 : 0),
      overdue: o ? round2_(L.fx.to(o.remaining, ccy)) : 0, maxDays: o ? o.maxDays : 0, status: c.status
    };
  }).filter(function (r) { return r.pct >= threshold; })
    .sort(function (a, b) { return b.pct - a.pct; });
  const byCcy = {};
  rows.forEach(function (r) {
    const x = byCcy[r.currency] = byCcy[r.currency] || { currency: r.currency, customers: 0, excess: 0, limit: 0, balance: 0 };
    x.customers++; x.excess = round2_(x.excess + r.excess); x.limit = round2_(x.limit + r.creditLimit); x.balance = round2_(x.balance + r.balance);
  });
  const excessBase = round2_(rows.reduce(function (s, r) { return s + fb.conv(r.excess, r.currency); }, 0));
  const info = fxInfo_(fb);
  info.missingRates = Object.keys(Object.assign({}, L.fx.missing, fb.missing));
  return Object.assign(info, {
    rows: rows, byCurrency: Object.keys(byCcy).map(function (k) { return byCcy[k]; }),
    totals: { customers: rows.length, exceeded: rows.filter(function (r) { return r.excess > 0; }).length, excessBase: excessBase }
  });
}

/**
 * Collections in a period by payment method and collector.
 * Collector = user who recorded the receipt; for imported D365 payments = the customer's collector.
 */
function reportCollections(token, f) {
  return collections_(auth_(token, 'collections'), f || {});
}

function collections_(user, f, L) {
  const from = f.dateFrom || today_().slice(0, 8) + '01', to = f.dateTo || today_();
  L = L || ledger_(user, to, f.currency);
  const isPay = paymentTest_(L.tx);
  const names = {};
  readTable('Users').forEach(function (u) { names[u.username] = u.fullName || u.username; });
  const rows = L.tx.filter(function (t) {
    return t.date >= from && t.date <= to && isPay(t) && customerFilter_(L.cmap[t.account], { group: f.group, account: f.account });
  }).map(function (t) {
    const c = L.cmap[t.account];
    return { voucher: t.voucher, date: t.date, account: t.account, name: c.name, group: c.group,
      collector: t.collectedBy || c.collector || '', method: PAY_METHODS.indexOf(t.payMethod) > -1 ? t.payMethod : 'Other',
      amount: round2_(t.cr), chequeNo: t.chequeNo || '', chequeDate: t.chequeDate || '', bankName: t.bankName || '', payRef: t.payRef || '' };
  }).filter(function (r) {
    return (!f.collector || r.collector === f.collector) && (!f.method || r.method === f.method);
  }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  const byCol = {}, byMethod = { Cash: 0, Cheque: 0, Transfer: 0, Other: 0 };
  rows.forEach(function (r) {
    const x = byCol[r.collector] = byCol[r.collector] || { collector: r.collector, name: r.collector ? (names[r.collector] || r.collector) : '',
      Cash: 0, Cheque: 0, Transfer: 0, Other: 0, total: 0, count: 0, customers: {} };
    x[r.method] = round2_(x[r.method] + r.amount);
    x.total = round2_(x.total + r.amount);
    x.count++;
    x.customers[r.account] = true;
    byMethod[r.method] = round2_(byMethod[r.method] + r.amount);
  });
  const collectors = Object.keys(byCol).map(function (k) {
    const x = byCol[k]; x.customers = Object.keys(x.customers).length; return x;
  }).sort(function (a, b) { return b.total - a.total; });
  return Object.assign(fxInfo_(L.fx), { from: from, to: to, rows: rows, collectors: collectors, byMethod: byMethod,
    totals: { total: sum_(rows, 'amount'), count: rows.length } });
}

/**
 * Collector performance over a period (customers grouped by their assigned collector):
 * opening balance + period invoices = due; collected (payments); other credits; remaining = closing balance.
 */
function reportPerformance(token, f) {
  return performance_(auth_(token, 'performance'), f || {});
}

function performance_(user, f, L, od) {
  const from = f.dateFrom || today_().slice(0, 8) + '01', to = f.dateTo || today_();
  L = L || ledger_(user, to, f.currency);
  const isPay = paymentTest_(L.tx);
  od = od || overdue_(user, { asOf: to }, L);
  const odMap = {};
  od.customers.forEach(function (c) { odMap[c.account] = c; });
  const names = {};
  readTable('Users').forEach(function (u) { names[u.username] = u.fullName || u.username; });
  const agg = {};
  L.tx.forEach(function (t) {
    const a = agg[t.account] = agg[t.account] || { opening: 0, invoiced: 0, collected: 0, otherCredits: 0 };
    if (t.date < from || isOpening_(t)) { a.opening += t.dr - t.cr; return; }
    a.invoiced += t.dr;
    if (isPay(t)) a.collected += t.cr; else a.otherCredits += t.cr;
  });
  const team = {};
  L.customers.filter(function (c) { return customerFilter_(c, { group: f.group, collector: f.collector }); }).forEach(function (c) {
    const k = c.collector || '';
    const m = team[k] = team[k] || { collector: k, name: k ? (names[k] || k) : '', companies: 0, activeCompanies: 0, opening: 0, invoiced: 0,
      due: 0, collected: 0, otherCredits: 0, remaining: 0, overdue: 0, overdueCustomers: 0, maxDays: 0, list: [] };
    const a = agg[c.account] || { opening: 0, invoiced: 0, collected: 0, otherCredits: 0 };
    const due = a.opening + a.invoiced, rem = due - a.collected - a.otherCredits;
    const o = odMap[c.account];
    m.companies++;
    if (a.opening || a.invoiced || a.collected || a.otherCredits) m.activeCompanies++;
    m.opening += a.opening; m.invoiced += a.invoiced; m.due += due; m.collected += a.collected;
    m.otherCredits += a.otherCredits; m.remaining += rem;
    if (o) { m.overdue += o.remaining; m.overdueCustomers++; m.maxDays = Math.max(m.maxDays, o.maxDays); }
    if (due || a.collected || rem) m.list.push({ account: c.account, name: c.name, opening: round2_(a.opening), invoiced: round2_(a.invoiced),
      due: round2_(due), collected: round2_(a.collected), otherCredits: round2_(a.otherCredits), remaining: round2_(rem),
      overdue: o ? o.remaining : 0, maxDays: o ? o.maxDays : 0, rate: due > 0 ? Math.round(a.collected / due * 100) : 0 });
  });
  const rows = Object.keys(team).map(function (k) {
    const m = team[k];
    ['opening', 'invoiced', 'due', 'collected', 'otherCredits', 'remaining', 'overdue'].forEach(function (x) { m[x] = round2_(m[x]); });
    m.rate = m.due > 0 ? Math.round(m.collected / m.due * 100) : 0;
    m.list.sort(function (a, b) { return b.remaining - a.remaining; });
    return m;
  }).sort(function (a, b) { return b.collected - a.collected; });
  const T = {};
  ['companies', 'opening', 'invoiced', 'due', 'collected', 'otherCredits', 'remaining', 'overdue'].forEach(function (x) { T[x] = round2_(rows.reduce(function (s, r) { return s + r[x]; }, 0)); });
  T.rate = T.due > 0 ? Math.round(T.collected / T.due * 100) : 0;
  return Object.assign(fxInfo_(L.fx), { from: from, to: to, rows: rows, totals: T });
}

/** Main dashboard KPIs (display currency) + cards per customer currency. */
function getDashboard(token, currency) {
  const user = auth_(token, 'dashboard');
  const today = today_();
  const L = ledger_(user, today, currency);
  const od = overdue_(user, { asOf: today }, L);
  const receivable = Object.keys(L.balance).reduce(function (s, a) { return s + L.balance[a]; }, 0);
  const monthStart = today.slice(0, 8) + '01';
  const months = [];
  const base = toDate_(monthStart);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    months.push({ key: Utilities.formatDate(d, TZ, 'yyyy-MM'), label: Utilities.formatDate(d, TZ, 'MMM'), debit: 0, credit: 0 });
  }
  const mIdx = {};
  months.forEach(function (m, i) { mIdx[m.key] = i; });
  const isPay = paymentTest_(L.tx);
  let collectedMTD = 0;
  L.tx.forEach(function (t) {
    const i = mIdx[t.date.slice(0, 7)];
    if (i !== undefined && !isOpening_(t)) { months[i].debit += t.dr; if (isPay(t)) months[i].credit += t.cr; }
    if (t.date >= monthStart && isPay(t)) collectedMTD += t.cr;
  });
  months.forEach(function (m) { m.debit = round2_(m.debit); m.credit = round2_(m.credit); });
  const drafts = readTable('Transactions').filter(function (t) { return !t.isDeleted && t.postStatus === 'Draft' && L.cmap[t.account]; }).length;
  const odMap = {};
  od.customers.forEach(function (x) { odMap[x.account] = x; });
  const top = Object.keys(L.balance).map(function (a) {
    const c = L.cmap[a], o = odMap[a];
    return { account: a, name: c.name, collector: c.collector, group: c.group, custCurrency: c.currency, balance: round2_(L.balance[a]),
      overdue: o ? o.remaining : 0, maxDays: o ? o.maxDays : 0 };
  }).sort(function (a, b) { return b.balance - a.balance; }).slice(0, 10);
  // Cards per customer currency: balances shown in each customer's own currency,
  // converted from local-currency amounts to avoid double-conversion rounding.
  const LL = L.fx.display === L.fx.local ? L : ledger_(user, today, L.fx.local);
  const odL = LL === L ? odMap : {};
  if (LL !== L) overdue_(user, { asOf: today }, LL).customers.forEach(function (x) { odL[x.account] = x; });
  const byCcy = {};
  LL.customers.forEach(function (c) {
    const ccy = String(c.currency || LL.fx.local || LL.fx.base).toUpperCase();
    const x = byCcy[ccy] = byCcy[ccy] || { currency: ccy, customers: 0, balance: 0, overdue: 0, overdueCustomers: 0, creditOver: 0 };
    const bal = LL.fx.to(LL.balance[c.account] || 0, ccy);
    x.customers++;
    x.balance += bal;
    if (odL[c.account]) { x.overdue += LL.fx.to(odL[c.account].remaining, ccy); x.overdueCustomers++; }
    if (+c.creditLimit > 0 && bal > +c.creditLimit) x.creditOver++;
  });
  const byCurrency = Object.keys(byCcy).map(function (k) {
    const x = byCcy[k]; x.balance = round2_(x.balance); x.overdue = round2_(x.overdue); return x;
  }).sort(function (a, b) { return b.customers - a.customers; });
  return Object.assign(fxInfo_(L.fx), {
    kpi: {
      customers: L.customers.length,
      active: L.customers.filter(function (c) { return c.status !== 'Blocked' && c.status !== 'Inactive'; }).length,
      receivable: round2_(receivable), overdue: od.totals.remaining, overdueCustomers: od.totals.customers,
      collectedMTD: round2_(collectedMTD), drafts: drafts, avgDays: od.totals.avgDays,
      creditOver: byCurrency.reduce(function (s, x) { return s + x.creditOver; }, 0)
    },
    months: months, buckets: od.buckets, top: top, byCurrency: byCurrency,
    // Month-to-date collections by method / collector and collector performance.
    collections: (function () { const c = collections_(user, { dateFrom: monthStart, dateTo: today }, L);
      return { byMethod: c.byMethod, collectors: c.collectors, totals: c.totals }; })(),
    performance: (function () { const pf = performance_(user, { dateFrom: monthStart, dateTo: today }, L, od);
      return { rows: pf.rows.map(function (r) { const o = Object.assign({}, r); delete o.list; return o; }), totals: pf.totals }; })()
  });
}

// ───────────────────────────── Demo data ─────────────────────────────
function loadDemoData() {
  setup();
  const groups = [{ groupId: 'CORP', groupName: 'Corporate' }, { groupId: 'GOV', groupName: 'Government' }, { groupId: 'RET', groupName: 'Retail' }];
  appendRows('CustomerGroups', groups);
  appendRows('Currencies', [{ code: 'SAR', name: 'Saudi Riyal', rate: 1, active: true }, { code: 'USD', name: 'US Dollar', rate: 3.75, active: true },
    { code: 'EUR', name: 'Euro', rate: 4.05, active: true }]);
  const salt = Utilities.getUuid();
  appendRows('Users', [{
    userId: Utilities.getUuid(), username: 'collector1', fullName: 'Ahmed Collector', email: '',
    passwordHash: hash_('collector123', salt), salt: salt, role: 'User',
    pages: 'dashboard,customers,overdue,followup,collection', canAdd: true, canEdit: true,
    canDelete: false, canPost: false, isCollector: true, scope: 'own', active: true, createdAt: new Date()
  }]);
  const names = ['Al Noor Trading', 'Gulf Steel Co.', 'Riyadh Medical', 'Desert Foods', 'Blue Sea Logistics', 'Najd Contracting', 'Ministry Supplies', 'Smart Retail'];
  const custs = names.map(function (n, i) {
    return {
      account: 'C' + (1001 + i), name: n, group: groups[i % 3].groupId, currency: ['SAR', 'SAR', 'USD'][i % 3], contactPerson: 'Contact ' + (i + 1),
      phone: '05' + (50000000 + i * 1111), email: 'ar' + (i + 1) + '@example.com', address: 'Street ' + (i + 10),
      city: ['Riyadh', 'Jeddah', 'Dammam'][i % 3], country: 'SA', creditLimit: 100000, termsDays: 30,
      collector: i % 2 ? 'collector1' : 'admin', status: 'Active', createdAt: new Date(2025, 0, 1 + i)
    };
  });
  appendRows('Customers', custs);
  const tx = [];
  const now = new Date();
  custs.forEach(function (c, ci) {
    for (let k = 0; k < 8; k++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 7 + k, 3 + ci);
      const amt = 5000 + ((ci * 37 + k * 53) % 20) * 1000;
      tx.push({ voucher: 'INV-' + c.account + '-' + k, type: 'Invoice', account: c.account, date: d, description: 'Sales invoice',
        dueDate: new Date(d.getTime() + 30 * 86400000), amountCur: -amt, currency: 'SAR', exchange: 1, debitMST: amt, creditMST: 0 });
      if (k < 8 - (ci % 4) - 1) {
        const p = new Date(d.getTime() + (20 + ci * 6) * 86400000);
        if (p < now) tx.push({ voucher: 'PAY-' + c.account + '-' + k, type: 'Payment', account: c.account, date: p, description: 'Customer payment',
          amountCur: amt, currency: 'SAR', exchange: 1, debitMST: 0, creditMST: amt });
      }
    }
  });
  tx.forEach(function (t) {
    t.rowId = Utilities.getUuid(); t.postStatus = 'Posted'; t.isDeleted = false;
    t.createdByName = 'D365 import'; t.createdAt = new Date(); t.userAdd = 'admin';
  });
  appendRows('Transactions', tx);
  return 'Demo data loaded';
}
