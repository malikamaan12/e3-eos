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
