export type SupportedLocale = 'en' | 'ar';
export type TextDirection = 'ltr' | 'rtl';

export interface LocaleConfig {
  locale: SupportedLocale;
  direction: TextDirection;
  label: string;
  nativeLabel: string;
}

export const SUPPORTED_LOCALES: Record<SupportedLocale, LocaleConfig> = {
  en: {
    locale: 'en',
    direction: 'ltr',
    label: 'English',
    nativeLabel: 'English',
  },
  ar: {
    locale: 'ar',
    direction: 'rtl',
    label: 'Arabic',
    nativeLabel: 'العربية',
  },
};

export const TRANSLATIONS: Record<SupportedLocale, Record<string, string>> = {
  en: {
    'app.title': 'E3 Enterprise Event Operating System',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.loading': 'Loading...',
    'common.offline': 'Offline Mode',
    'common.stale': 'Stale Data Disclosed',
    'common.permission_denied': 'Permission Denied',
    'common.why_blocked': 'Why is this action blocked?',
    'common.exception_route': 'Request Policy Exception',
    'status.draft': 'Draft',
    'status.in_review': 'In Review',
    'status.approved': 'Approved',
    'status.rejected': 'Rejected',
    'status.ready_to_open': 'Ready to Open',
    'status.operational_closed': 'Operationally Closed',
    'status.open_receivables': 'Open Receivables',
    'stages.s01': '01: Project Onboarding',
    'stages.s02': '02: Qualification & Feasibility',
    'stages.s03': '03: Concept & First Draft',
    'stages.s04': '04: Clarification & Design Development',
    'stages.s05': '05: Proposal Submission & Authorisation',
    'stages.s06': '06: Detailed Delivery Planning',
    'stages.s07': '07: Vendor Selection & Orders',
    'stages.s08': '08: Production & Resource Preparation',
    'stages.s09': '09: Logistics & Bump-in',
    'stages.s10': '10: Finishing & Readiness',
    'stages.s11': '11: Live Operations & Delivery',
    'stages.s12': '12: Bump-out & Reconciliation',
    'stages.s13': '13: Post-Event Report, Closure & Learning',
    'portal.client_room': 'Client Project Room',
    'portal.view_proposal': 'View Commercial Proposal',
    'portal.approve_change': 'Approve Change Request',
    'portal.margin_redacted': 'Protected Internal Margin',
    // Navigation & Workspaces
    'nav.home': 'Dashboard',
    'nav.cockpit': 'Project Cockpit',
    'nav.financial_control': 'Financial Control Centre',
    'nav.approvals': 'Governance Approvals',
    'nav.calendar': 'Master Event Calendar',
    'nav.command_center': 'Live Command Centre',
    'nav.users': 'User Administration',
    // Actions & Operations
    'action.refresh': 'Refresh',
    'action.create_project': 'New Project',
    'action.open_cockpit': 'Open Cockpit',
    'action.submit': 'Submit',
    'action.approve': 'Approve',
    'action.reject': 'Reject',
    'action.filter': 'Filter',
    'action.export': 'Export',
    'action.close': 'Close',
    'action.details': 'Details',
    'action.audit': 'Audit as Role',
    // Financial & Governance Invariants
    'finance.current_budget': 'Current Budget',
    'finance.eac': 'Estimate at Completion (EAC)',
    'finance.vac': 'Variance at Completion (VAC)',
    'finance.actual_cost': 'Actual Cost (AC)',
    'finance.committed': 'Committed Cost',
    'finance.uncommitted': 'Uncommitted Budget',
    'finance.governed_formula': 'Governed Formula: VAC = Current Budget - EAC',
    // Operational Statuses
    'status.active': 'Active',
    'status.pending': 'Pending',
    'status.completed': 'Completed',
    'status.blocked': 'Blocked',
    'status.overdue': 'Overdue',
    'status.permitted': 'Permitted',
    // Calendar & Views
    'calendar.month': 'Month',
    'calendar.week': 'Week',
    'calendar.agenda': 'Agenda',
    'calendar.all_venues': 'All Venues (Doha)',
    'calendar.all_phases': 'All Phases',
    'calendar.move_in': 'Move-in & Rigging',
    'calendar.rehearsal': 'Rehearsal',
    'calendar.show': 'Live Show',
    'calendar.bump_out': 'Bump-out & Teardown',
    'view.matrix': 'Comparison Matrix',
    'view.cards': 'Card View',
  },
  ar: {
    'app.title': 'نظام إدارة فعاليات إي 3 للمؤسسات',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.confirm': 'تأكيد',
    'common.loading': 'جارٍ التحميل...',
    'common.offline': 'وضع العمل دون اتصال',
    'common.stale': 'بيانات قديمة تم الإفصاح عنها',
    'common.permission_denied': 'تم رفض الإذن',
    'common.why_blocked': 'لماذا تم حظر هذا الإجراء؟',
    'common.exception_route': 'طلب استثناء من السياسة',
    'status.draft': 'مسودة',
    'status.in_review': 'قيد المراجعة',
    'status.approved': 'معتمد',
    'status.rejected': 'مرفوض',
    'status.ready_to_open': 'جاهز للافتتاح',
    'status.operational_closed': 'مغلق تشغيلياً',
    'status.open_receivables': 'مستحقات معلقة',
    'stages.s01': '01: إعداد المشروع والبدء',
    'stages.s02': '02: التأهيل ودراسة الجدوى',
    'stages.s03': '03: الفكرة والتصميم الأولي',
    'stages.s04': '04: التوضيحات وتطوير التصميم',
    'stages.s05': '05: تقديم العرض والاعتماد',
    'stages.s06': '06: التخطيط التفصيلي للتنفيذ',
    'stages.s07': '07: اختيار الموردين وأوامر الشراء',
    'stages.s08': '08: الإنتاج وتجهيز الموارد',
    'stages.s09': '09: الخدمات اللوجستية والتركيب',
    'stages.s10': '10: اللمسات الأخيرة وجاهزية الافتتاح',
    'stages.s11': '11: العمليات المباشرة وإدارة الفعالية',
    'stages.s12': '12: التفكيك والتسويات النهائية',
    'stages.s13': '13: التقرير النهائي، الإغلاق والدروس المستفادة',
    'portal.client_room': 'غرفة مشاريع العميل',
    'portal.view_proposal': 'عرض المقترح التجاري',
    'portal.approve_change': 'اعتماد طلب التغيير',
    'portal.margin_redacted': 'هامش داخلي محمي',
    // Navigation & Workspaces
    'nav.home': 'لوحة المعلومات الرئيسية',
    'nav.cockpit': 'غرفة قيادة المشروع',
    'nav.financial_control': 'مركز الرقابة المالية',
    'nav.approvals': 'الموافقات والحوكمة',
    'nav.calendar': 'التقويم العام للفعاليات',
    'nav.command_center': 'مركز القيادة الميداني',
    'nav.users': 'إدارة المستخدمين والصلاحيات',
    // Actions & Operations
    'action.refresh': 'تحديث',
    'action.create_project': 'مشروع جديد',
    'action.open_cockpit': 'فتح لوحة التحكم',
    'action.submit': 'إرسال',
    'action.approve': 'اعتماد',
    'action.reject': 'رفض',
    'action.filter': 'تصفية',
    'action.export': 'تصدير',
    'action.close': 'إغلاق',
    'action.details': 'التفاصيل',
    'action.audit': 'معاينة كـ دور',
    // Financial & Governance Invariants
    'finance.current_budget': 'الميزانية الحالية المعتمدة',
    'finance.eac': 'التكلفة التقديرية عند الاكتمال (EAC)',
    'finance.vac': 'تباين التكلفة عند الاكتمال (VAC)',
    'finance.actual_cost': 'التكلفة الفعلية (AC)',
    'finance.committed': 'التكاليف الملتزم بها',
    'finance.uncommitted': 'الميزانية غير الملتزم بها',
    'finance.governed_formula': 'المعادلة الحاكمة: تباين الاكتمال (VAC) = الميزانية الحالية - التكلفة عند الاكتمال',
    // Operational Statuses
    'status.active': 'نشط',
    'status.pending': 'معلق',
    'status.completed': 'مكتمل',
    'status.blocked': 'معطل / محظور',
    'status.overdue': 'متأخر',
    'status.permitted': 'مسموح التشغيل',
    // Calendar & Views
    'calendar.month': 'عرض الشهر',
    'calendar.week': 'عرض الأسبوع',
    'calendar.agenda': 'جدول الأعمال',
    'calendar.all_venues': 'جميع الأماكن (الدوحة)',
    'calendar.all_phases': 'جميع المراحل',
    'calendar.move_in': 'تركيب وبناء',
    'calendar.rehearsal': 'بروفات وتجارب',
    'calendar.show': 'عرض مباشر',
    'calendar.bump_out': 'تفكيك وإرجاع',
    'view.matrix': 'مصفوفة المقارنة',
    'view.cards': 'عرض البطاقات',
  },
};

export class LocalizationService {
  private currentLocale: SupportedLocale = 'en';

  constructor(initialLocale: SupportedLocale = 'en') {
    this.currentLocale = initialLocale;
  }

  setLocale(locale: SupportedLocale): void {
    this.currentLocale = locale;
  }

  getLocale(): SupportedLocale {
    return this.currentLocale;
  }

  getDirection(): TextDirection {
    return SUPPORTED_LOCALES[this.currentLocale].direction;
  }

  translate(key: string, locale?: SupportedLocale): string {
    const loc = locale || this.currentLocale;
    return TRANSLATIONS[loc]?.[key] || TRANSLATIONS['en']?.[key] || key;
  }

  formatCurrency(amount: number | string, currency: string, locale?: SupportedLocale): string {
    const loc = locale || this.currentLocale;
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(num)) return `0.00 ${currency}`;

    if (loc === 'ar') {
      const formatted = num.toLocaleString('ar-QA', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const currSymbol = currency === 'QAR' ? 'ر.ق' : currency === 'AED' ? 'د.إ' : currency;
      return `${formatted} ${currSymbol}`;
    }

    const formatted = num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formatted} ${currency}`;
  }

  formatDate(isoString: string, locale?: SupportedLocale): string {
    const loc = locale || this.currentLocale;
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;

    return date.toLocaleDateString(loc === 'ar' ? 'ar-QA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

const defaultLocalizationService = new LocalizationService('en');

export function formatCurrencyInLocale(currency: string, amount: number | string, locale: SupportedLocale = 'en'): string {
  return defaultLocalizationService.formatCurrency(amount, currency, locale);
}

export function translateInLocale(key: string, locale: SupportedLocale = 'en'): string {
  return defaultLocalizationService.translate(key, locale);
}

export function getStageTitleInLocale(stageNumber: number, locale: SupportedLocale = 'en'): string {
  const stageKey = `stages.s${String(stageNumber).padStart(2, '0')}`;
  return translateInLocale(stageKey, locale);
}

