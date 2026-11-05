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
  { key: 'accounts', title: 'دليل الحسابات', group: 'المالية', icon: 'book', actions: ['view', 'add', 'edit', 'delete'] },
  { key: 'receipts', title: 'سندات التحويل', group: 'المالية', icon: 'receipt', actions: ['view', 'add', 'edit', 'delete', 'post'], phase: 2 },
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
      { entity: 'accounts', field: 'MainAccount', label: 'حسابات فرعية' }
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
    refs: []
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
      { entity: 'projects', field: 'ProjectType', match: 'Name', when: { LookupType: 'ProjectType' }, label: 'مشروعات' }
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

/** شيتات المرحلة الثانية (تُنشأ الآن لتجهيز الهيكل) — من ملف Form_add_Receipt */
var PHASE2_SHEETS = {
  Receipts: {
    columns: ['DocumentNumber', 'JournalType', 'Date', 'Bank', 'TransferKWD', 'TransferUSD', 'TransferDJF',
      'Reference', 'ForeignMinistryRequest', 'RateKWD_USD', 'RateUSD_DJF', 'TotalKWD', 'TotalUSD', 'TotalDJF',
      'Status', 'PostedAt', 'PostedBy', 'CreatedAt', 'CreatedBy', 'ModifiedAt', 'ModifiedBy'],
    labels: ['رقم المستند', 'نوع اليومية', 'تاريخ', 'البنك', 'قيمة التحويل بالدينار', 'قيمة التحويل بالدولار',
      'قيمة التحويل بالفرنك', 'مرجع', 'طلب الخارجية الكويتية', 'معامل الدينار/دولار', 'معامل دولار/فرنك',
      'إجمالي دينار', 'إجمالي دولار', 'إجمالي فرنك', 'الحالة', 'تاريخ الترحيل', 'رحّل بواسطة',
      'تاريخ الإنشاء', 'أنشئ بواسطة', 'تاريخ التعديل', 'عُدّل بواسطة']
  },
  ReceiptLines: {
    columns: ['LineId', 'DocumentNumber', 'StatItemNo', 'StatItemName', 'AddressNo', 'TransferFormNo',
      'AccountId', 'AccountName', 'ProjectId', 'Description', 'AmountKWD', 'AmountUSD', 'AmountDJF'],
    labels: ['رقم السطر', 'رقم المستند', 'رقم البند الإحصائي', 'اسم البند الإحصائي', 'رقم مخاطبة',
      'رقم نموذج التحويل', 'كود الحساب', 'اسم الحساب', 'معرف المشروع', 'وصف المعاملة', 'المبلغ دينار',
      'المبلغ دولار', 'المبلغ فرنك']
  }
};
