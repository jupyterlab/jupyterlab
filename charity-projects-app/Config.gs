/**
 * إعدادات النظام: الصفحات، الإجراءات، الكيانات (الشيتات) وحقولها.
 * نظام إدارة مشروعات الجمعية الخيرية — المرحلة الأولى
 */

var APP = {
  name: 'نظام إدارة المشروعات الخيرية',
  orgName: 'الجمعية الخيرية',
  sessionSeconds: 6 * 60 * 60, // أقصى مدة يسمح بها CacheService
  hashIterations: 300,
  maxLoginAttempts: 5,
  lockMinutes: 15,
  auditListLimit: 1000
};

/** الإجراءات الممكنة داخل أي صفحة */
var ACTIONS = [
  { key: 'view', label: 'عرض' },
  { key: 'add', label: 'إضافة' },
  { key: 'edit', label: 'تعديل' },
  { key: 'delete', label: 'حذف' },
  { key: 'post', label: 'ترحيل' }
];

/** الصفحات (مستوى الصلاحية الأول) والإجراءات المتاحة في كل صفحة */
var PAGES = [
  { key: 'dashboard', title: 'الرئيسية', group: 'الرئيسية', icon: 'home', actions: ['view'] },
  { key: 'projects', title: 'المشروعات', group: 'المشروعات', icon: 'folder', actions: ['view', 'add', 'edit', 'delete'] },
  { key: 'balances', title: 'أرصدة المشروعات', group: 'المشروعات', icon: 'chart', actions: ['view'] },
  { key: 'accounts', title: 'دليل الحسابات', group: 'المالية', icon: 'book', actions: ['view', 'add', 'edit', 'delete'] },
  { key: 'receipts', title: 'سندات التحويل', group: 'المالية', icon: 'receipt', actions: ['view', 'add', 'edit', 'delete', 'post'] },
  { key: 'payments', title: 'سندات الصرف', group: 'المالية', icon: 'payment', actions: ['view', 'add', 'edit', 'delete', 'post'] },
  { key: 'lookups', title: 'القوائم المساعدة', group: 'الإعدادات', icon: 'tag', actions: ['view', 'add', 'edit', 'delete'] },
  { key: 'users', title: 'المستخدمون والصلاحيات', group: 'الإعدادات', icon: 'users', actions: ['view', 'add', 'edit', 'delete'] },
  { key: 'audit', title: 'سجل العمليات', group: 'الإعدادات', icon: 'history', actions: ['view'] }
];

/** أنواع القوائم المساعدة */
var LOOKUP_TYPES = [
  { v: 'Bank', l: 'البنوك' },
  { v: 'JournalType', l: 'أنواع اليوميات' },
  { v: 'ProjectGroup', l: 'مجموعات المشروعات' },
  { v: 'ProjectType', l: 'أنواع المشروعات' }
];

/**
 * تعريف الكيانات.
 * أنواع الحقول: text | textarea | email | number | date | datetime | select | checkbox
 * system: حقل يملؤه النظام فقط — derive: حقل محسوب من كيان آخر
 */
var ENTITIES = {
  accounts: {
    page: 'accounts', sheet: 'ChartOfAccounts', key: 'AccountId', titleField: 'AccountName',
    singular: 'حساب', plural: 'الحسابات', icon: 'book',
    fields: [
      { name: 'AccountId', label: 'معرف الحساب', type: 'text', required: true, list: true, text: true },
      { name: 'AccountName', label: 'اسم الحساب', type: 'text', required: true, list: true },
      { name: 'MainAccount', label: 'الحساب الرئيسي', type: 'select', source: { entity: 'accounts' }, list: true, text: true },
      { name: 'IsActive', label: 'نشط', type: 'checkbox', default: true, list: true },
      { name: 'CreatedAt', label: 'تاريخ الإنشاء', type: 'datetime', system: true, list: true },
      { name: 'CreatedBy', label: 'أنشئ بواسطة', type: 'text', system: true },
      { name: 'ModifiedAt', label: 'تاريخ التعديل', type: 'datetime', system: true },
      { name: 'ModifiedBy', label: 'عُدّل بواسطة', type: 'text', system: true }
    ],
    refs: [
      { entity: 'projects', field: 'AccountId', label: 'مشروعات' },
      { entity: 'accounts', field: 'MainAccount', label: 'حسابات فرعية' },
      { sheet: 'ReceiptLines', field: 'AccountId', label: 'سطر في سندات التحويل' },
      { sheet: 'PaymentLines', field: 'AccountId', label: 'سطر في سندات الصرف' }
    ]
  },

  projects: {
    page: 'projects', sheet: 'Projects', key: 'ProjectId', titleField: 'Description',
    singular: 'مشروع', plural: 'المشروعات', icon: 'folder', createdField: 'CreatedDateTime',
    fields: [
      { name: 'ProjectId', label: 'معرف المشروع', section: 'بيانات المشروع', type: 'text', required: true, list: true, text: true },
      { name: 'Description', label: 'الوصف', section: 'بيانات المشروع', type: 'text', required: true, list: true },
      { name: 'ProjectGroup', label: 'مجموعة المشروع', section: 'بيانات المشروع', type: 'select', source: { lookup: 'ProjectGroup' }, required: true, list: true },
      { name: 'ProjectType', label: 'نوع المشروع', section: 'بيانات المشروع', type: 'select', source: { lookup: 'ProjectType' }, required: true, list: true },
      { name: 'ProjectedStartDate', label: 'تاريخ البدء المتوقع', section: 'بيانات المشروع', type: 'date', list: true },
      { name: 'AccountId', label: 'كود الحساب', section: 'الربط المحاسبي', type: 'select', source: { entity: 'accounts' }, required: true, list: true, text: true },
      { name: 'AccountName', label: 'اسم الحساب', section: 'الربط المحاسبي', type: 'text', derive: { from: 'AccountId', entity: 'accounts', field: 'AccountName' }, list: true },
      { name: 'CreatedDateTime', label: 'تاريخ ووقت الإنشاء', type: 'datetime', system: true, list: true },
      { name: 'CreatedBy', label: 'أنشئ بواسطة', type: 'text', system: true },
      { name: 'ModifiedAt', label: 'تاريخ التعديل', type: 'datetime', system: true },
      { name: 'ModifiedBy', label: 'عُدّل بواسطة', type: 'text', system: true }
    ],
    refs: [
      { sheet: 'ReceiptLines', field: 'ProjectId', label: 'سطر في سندات التحويل' },
      { sheet: 'Payments', field: 'ProjectId', label: 'سند صرف' }
    ]
  },

  lookups: {
    page: 'lookups', sheet: 'Lookups', key: 'LookupId', autoKey: true, titleField: 'Name',
    singular: 'عنصر', plural: 'القوائم المساعدة', icon: 'tag',
    unique: [['LookupType', 'Name']],
    fields: [
      { name: 'LookupId', label: 'المعرف', type: 'number', system: true, list: true },
      { name: 'LookupType', label: 'نوع القائمة', type: 'select', source: { "static": LOOKUP_TYPES }, required: true, list: true },
      { name: 'Code', label: 'الكود', type: 'text', list: true, text: true },
      { name: 'Name', label: 'الاسم', type: 'text', required: true, list: true },
      { name: 'IsActive', label: 'نشط', type: 'checkbox', default: true, list: true },
      { name: 'CreatedAt', label: 'تاريخ الإنشاء', type: 'datetime', system: true },
      { name: 'CreatedBy', label: 'أنشئ بواسطة', type: 'text', system: true },
      { name: 'ModifiedAt', label: 'تاريخ التعديل', type: 'datetime', system: true },
      { name: 'ModifiedBy', label: 'عُدّل بواسطة', type: 'text', system: true }
    ],
    refs: [
      { entity: 'projects', field: 'ProjectGroup', match: 'Name', when: { LookupType: 'ProjectGroup' }, label: 'مشروعات' },
      { entity: 'projects', field: 'ProjectType', match: 'Name', when: { LookupType: 'ProjectType' }, label: 'مشروعات' },
      { sheet: 'Receipts', field: 'Bank', match: 'Name', when: { LookupType: 'Bank' }, label: 'سندات تحويل' },
      { sheet: 'Receipts', field: 'JournalType', match: 'Name', when: { LookupType: 'JournalType' }, label: 'سندات تحويل' }
    ]
  },

  users: {
    page: 'users', sheet: 'Users', key: 'UserId', autoKey: true, titleField: 'FullName', custom: true,
    singular: 'مستخدم', plural: 'المستخدمون', icon: 'users',
    fields: [
      { name: 'UserId', label: 'المعرف', type: 'number', system: true, list: true },
      { name: 'Username', label: 'اسم المستخدم', section: 'بيانات المستخدم', type: 'text', required: true, list: true, text: true },
      { name: 'FullName', label: 'الاسم الكامل', section: 'بيانات المستخدم', type: 'text', required: true, list: true },
      { name: 'Email', label: 'البريد الإلكتروني', section: 'بيانات المستخدم', type: 'email', required: true, list: true },
      { name: 'IsActive', label: 'نشط', section: 'الحالة والأمان', type: 'checkbox', default: true, list: true },
      { name: 'IsAdmin', label: 'مدير نظام (كل الصلاحيات)', section: 'الحالة والأمان', type: 'checkbox', list: true },
      { name: 'MustChangePassword', label: 'يجب تغيير كلمة المرور عند الدخول', section: 'الحالة والأمان', type: 'checkbox', default: true },
      { name: 'LastLogin', label: 'آخر دخول', type: 'datetime', system: true, list: true },
      { name: 'CreatedAt', label: 'تاريخ الإنشاء', type: 'datetime', system: true },
      { name: 'CreatedBy', label: 'أنشئ بواسطة', type: 'text', system: true },
      { name: 'ModifiedAt', label: 'تاريخ التعديل', type: 'datetime', system: true },
      { name: 'ModifiedBy', label: 'عُدّل بواسطة', type: 'text', system: true }
    ]
  },

  audit: {
    page: 'audit', sheet: 'AuditLog', key: 'LogId', autoKey: true, titleField: 'Action', readOnly: true,
    singular: 'عملية', plural: 'سجل العمليات', icon: 'history',
    fields: [
      { name: 'LogId', label: 'المعرف', type: 'number', system: true, list: true },
      { name: 'Timestamp', label: 'الوقت', type: 'datetime', system: true, list: true },
      { name: 'Username', label: 'المستخدم', type: 'text', system: true, list: true },
      { name: 'Action', label: 'الإجراء', type: 'text', system: true, list: true },
      { name: 'Entity', label: 'الصفحة', type: 'text', system: true, list: true },
      { name: 'RecordKey', label: 'السجل', type: 'text', system: true, list: true },
      { name: 'Details', label: 'التفاصيل', type: 'text', system: true, list: true }
    ]
  }
};

/** أعمدة شيت المستخدمين الفعلية (تتضمن حقولاً سرية لا تُرسل للواجهة) */
var USER_COLUMNS = ['UserId', 'Username', 'FullName', 'Email', 'PasswordHash', 'Salt', 'IsActive', 'IsAdmin',
  'MustChangePassword', 'Permissions', 'LastLogin', 'CreatedAt', 'CreatedBy', 'ModifiedAt', 'ModifiedBy'];

/* ================= المرحلة الثانية: السندات (رأس + سطور) ================= */

var DOC_STATUS = [{ v: 'Draft', l: 'مسودة' }, { v: 'Posted', l: 'مرحّل' }];
var CURRENCIES = [{ v: 'KWD', l: 'دينار كويتي' }, { v: 'USD', l: 'دولار أمريكي' }, { v: 'DJF', l: 'فرنك جيبوتي' }];

function docSystemFields_() {
  return [
    { name: 'PostedAt', label: 'تاريخ الترحيل', type: 'datetime', system: true },
    { name: 'PostedBy', label: 'رحّل بواسطة', type: 'text', system: true },
    { name: 'CreatedAt', label: 'تاريخ الإنشاء', type: 'datetime', system: true },
    { name: 'CreatedBy', label: 'أنشئ بواسطة', type: 'text', system: true },
    { name: 'ModifiedAt', label: 'تاريخ التعديل', type: 'datetime', system: true },
    { name: 'ModifiedBy', label: 'عُدّل بواسطة', type: 'text', system: true }
  ];
}

/** سند التحويل المستلم من المتبرع — من شيت Form_add_Receipt */
ENTITIES.receipts = {
  page: 'receipts', sheet: 'Receipts', key: 'DocumentNumber', doc: true, prefix: 'RC', titleField: 'DocumentNumber',
  singular: 'سند تحويل', plural: 'سندات التحويل', icon: 'receipt',
  fields: [
    { name: 'DocumentNumber', label: 'رقم المستند', section: 'بيانات السند', type: 'text', readonly: true, list: true, text: true, placeholder: 'تلقائي' },
    { name: 'Status', label: 'الحالة', section: 'بيانات السند', type: 'select', source: { "static": DOC_STATUS }, readonly: true, list: true },
    { name: 'JournalType', label: 'نوع اليومية', section: 'بيانات السند', type: 'select', source: { lookup: 'JournalType' }, required: true, list: true },
    { name: 'Date', label: 'تاريخ', section: 'بيانات السند', type: 'date', required: true, list: true },
    { name: 'Bank', label: 'البنك', section: 'بيانات السند', type: 'select', source: { lookup: 'Bank' }, required: true, list: true },
    { name: 'Reference', label: 'مرجع', section: 'بيانات السند', type: 'text', list: true },
    { name: 'ForeignMinistryRequest', label: 'طلب الخارجية الكويتية', section: 'بيانات السند', type: 'text' },
    { name: 'TransferKWD', label: 'قيمة التحويل بالدينار', section: 'قيم التحويل', type: 'number', decimals: 3, required: true, positive: true, list: true },
    { name: 'TransferUSD', label: 'قيمة التحويل بالدولار', section: 'قيم التحويل', type: 'number', decimals: 2, required: true, positive: true, list: true },
    { name: 'TransferDJF', label: 'قيمة التحويل بالفرنك', section: 'قيم التحويل', type: 'number', decimals: 0, required: true, positive: true, list: true },
    { name: 'RateKWD_USD', label: 'معامل الدينار/دولار', section: 'قيم التحويل', type: 'number', decimals: 6, calc: true },
    { name: 'RateUSD_DJF', label: 'معامل دولار/فرنك', section: 'قيم التحويل', type: 'number', decimals: 6, calc: true },
    { name: 'TotalKWD', label: 'إجمالي دينار', type: 'number', decimals: 3, calc: true, hidden: true },
    { name: 'TotalUSD', label: 'إجمالي دولار', type: 'number', decimals: 2, calc: true, hidden: true },
    { name: 'TotalDJF', label: 'إجمالي فرنك', type: 'number', decimals: 0, calc: true, hidden: true }
  ].concat(docSystemFields_()),
  lines: {
    sheet: 'ReceiptLines', fk: 'DocumentNumber',
    fields: [
      { name: 'LineId', label: 'رقم السطر', type: 'number', calc: true, width: 60 },
      { name: 'ProjectId', label: 'المشروع', type: 'select', source: { entity: 'projects' }, required: true, text: true, width: 220 },
      { name: 'AccountId', label: 'كود الحساب', type: 'text', required: true, derive: { from: 'ProjectId', entity: 'projects', field: 'AccountId' }, text: true, width: 90 },
      { name: 'AccountName', label: 'اسم الحساب', type: 'text', derive: { from: 'ProjectId', entity: 'projects', field: 'AccountName' }, width: 150 },
      { name: 'StatItemNo', label: 'رقم البند الإحصائي', type: 'text', text: true, width: 100 },
      { name: 'StatItemName', label: 'اسم البند الإحصائي', type: 'text', width: 140 },
      { name: 'AddressNo', label: 'رقم مخاطبة', type: 'text', text: true, width: 100 },
      { name: 'TransferFormNo', label: 'رقم نموذج التحويل', type: 'text', text: true, width: 100 },
      { name: 'Description', label: 'وصف المعاملة', type: 'text', width: 180 },
      { name: 'AmountKWD', label: 'المبلغ دينار', type: 'number', decimals: 3, required: true, positive: true, width: 110 },
      { name: 'AmountUSD', label: 'المبلغ دولار', type: 'number', decimals: 2, calc: true, width: 110 },
      { name: 'AmountDJF', label: 'المبلغ فرنك', type: 'number', decimals: 0, calc: true, width: 120 }
    ]
  }
};

/** سند الصرف على المشروع */
ENTITIES.payments = {
  page: 'payments', sheet: 'Payments', key: 'VoucherNo', doc: true, prefix: 'PV', titleField: 'VoucherNo',
  singular: 'سند صرف', plural: 'سندات الصرف', icon: 'payment',
  fields: [
    { name: 'VoucherNo', label: 'رقم سند الصرف', section: 'بيانات السند', type: 'text', readonly: true, list: true, text: true, placeholder: 'تلقائي' },
    { name: 'Status', label: 'الحالة', section: 'بيانات السند', type: 'select', source: { "static": DOC_STATUS }, readonly: true, list: true },
    { name: 'Date', label: 'التاريخ', section: 'بيانات السند', type: 'date', required: true, list: true },
    { name: 'ProjectId', label: 'معرف المشروع', section: 'المشروع', type: 'select', source: { entity: 'projects' }, required: true, list: true, text: true },
    { name: 'ProjectName', label: 'اسم المشروع', section: 'المشروع', type: 'text', derive: { from: 'ProjectId', entity: 'projects', field: 'Description' }, list: true },
    { name: 'Description', label: 'البيان', section: 'المشروع', type: 'textarea', required: true, list: true },
    { name: 'TotalKWD', label: 'إجمالي دينار', type: 'number', decimals: 3, calc: true, hidden: true, list: true },
    { name: 'TotalUSD', label: 'إجمالي دولار', type: 'number', decimals: 2, calc: true, hidden: true, list: true },
    { name: 'TotalDJF', label: 'إجمالي فرنك', type: 'number', decimals: 0, calc: true, hidden: true, list: true }
  ].concat(docSystemFields_()),
  lines: {
    sheet: 'PaymentLines', fk: 'VoucherNo',
    fields: [
      { name: 'LineId', label: 'رقم السطر', type: 'number', calc: true, width: 60 },
      { name: 'AccountId', label: 'حساب الصرف', type: 'select', source: { entity: 'accounts' }, required: true, text: true, width: 220 },
      { name: 'AccountName', label: 'اسم الحساب', type: 'text', derive: { from: 'AccountId', entity: 'accounts', field: 'AccountName' }, width: 170 },
      { name: 'Amount', label: 'المبلغ', type: 'number', decimals: 3, required: true, positive: true, width: 120 },
      { name: 'Currency', label: 'العملة', type: 'select', source: { "static": CURRENCIES }, required: true, width: 130, "default": 'KWD' },
      { name: 'Description', label: 'البيان', type: 'text', width: 240 }
    ]
  }
};

/**
 * الحسابات المشتركة بين الخادم والواجهة (تُحقن في الصفحة كما هي).
 * سند التحويل: المعامل = قيمة التحويل بالعملة ÷ قيمة التحويل بالعملة الأساس،
 * ويُعدّل آخر سطر بفرق التقريب حتى يطابق الإجمالي قيمة التحويل تماماً.
 */
function calcDoc_(entity, h, lines) {
  function r(n, d) { var p = Math.pow(10, d); var x = Number(n) || 0; return Math.round(x * p + (x >= 0 ? 1e-9 : -1e-9)) / p; }
  if (entity === 'receipts') {
    var kwd = r(h.TransferKWD, 3), usd = r(h.TransferUSD, 2), djf = r(h.TransferDJF, 0);
    var r1 = kwd ? usd / kwd : 0, r2 = usd ? djf / usd : 0;
    h.RateKWD_USD = r(r1, 6); h.RateUSD_DJF = r(r2, 6);
    var tk = 0, tu = 0, td = 0;
    lines.forEach(function (l, i) {
      l.LineId = i + 1;
      l.AmountKWD = r(l.AmountKWD, 3);
      l.AmountUSD = r(l.AmountKWD * r1, 2);
      l.AmountDJF = r(l.AmountKWD * r1 * r2, 0);
      tk += l.AmountKWD; tu += l.AmountUSD; td += l.AmountDJF;
    });
    tk = r(tk, 3);
    if (lines.length && Math.abs(tk - kwd) < 0.0005) {
      var last = lines[lines.length - 1];
      last.AmountUSD = r(last.AmountUSD + usd - tu, 2);
      last.AmountDJF = r(last.AmountDJF + djf - td, 0);
      tu = usd; td = djf;
    }
    h.TotalKWD = tk; h.TotalUSD = r(tu, 2); h.TotalDJF = r(td, 0);
    h._diff = { KWD: r(kwd - tk, 3), USD: r(usd - h.TotalUSD, 2), DJF: r(djf - h.TotalDJF, 0) };
    h._balanced = lines.length > 0 && kwd > 0 && h._diff.KWD === 0 && h._diff.USD === 0 && h._diff.DJF === 0;
  } else if (entity === 'payments') {
    var dec = { KWD: 3, USD: 2, DJF: 0 }, t = { KWD: 0, USD: 0, DJF: 0 };
    lines.forEach(function (l, i) {
      l.LineId = i + 1;
      var d = dec[l.Currency] !== undefined ? dec[l.Currency] : 3;
      l.Amount = r(l.Amount, d);
      if (t[l.Currency] !== undefined) t[l.Currency] += l.Amount;
    });
    h.TotalKWD = r(t.KWD, 3); h.TotalUSD = r(t.USD, 2); h.TotalDJF = r(t.DJF, 0);
    h._balanced = lines.length > 0;
  }
  return h;
}
