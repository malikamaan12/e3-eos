import { CurrencyCode } from './money.js';

export interface CountryPackProfile {
  countryCode: string;
  jurisdiction: string;
  primaryCurrency: CurrencyCode;
  vatRatePercent: number;
  labourMaxDailyHours: number;
  summerOutdoorWorkRestriction: {
    enabled: boolean;
    startTime: string; // e.g. '10:00'
    endTime: string; // e.g. '15:30'
    startMonth: number; // 6 = June
    endMonth: number; // 9 = September
  };
  zatcaComplianceEnabled: boolean;
}

export const CANONICAL_COUNTRY_PACKS: Record<string, CountryPackProfile> = {
  QA: {
    countryCode: 'QA',
    jurisdiction: 'State of Qatar',
    primaryCurrency: 'QAR',
    vatRatePercent: 0, // Qatar standard VAT 0%
    labourMaxDailyHours: 10, // Qatar Labour Law No. 14 of 2004
    summerOutdoorWorkRestriction: {
      enabled: true,
      startTime: '10:00',
      endTime: '15:30',
      startMonth: 6, // June 1
      endMonth: 9, // September 15 (Ministerial Decision No. 17 of 2021)
    },
    zatcaComplianceEnabled: false,
  },
  SA: {
    countryCode: 'SA',
    jurisdiction: 'Kingdom of Saudi Arabia',
    primaryCurrency: 'SAR',
    vatRatePercent: 15, // ZATCA Standard VAT 15%
    labourMaxDailyHours: 8, // Saudi Labour Law
    summerOutdoorWorkRestriction: {
      enabled: true,
      startTime: '12:00',
      endTime: '15:00',
      startMonth: 6, // June 15
      endMonth: 9, // September 15
    },
    zatcaComplianceEnabled: true, // ZATCA Phase 2 E-Invoicing
  },
  AE: {
    countryCode: 'AE',
    jurisdiction: 'United Arab Emirates',
    primaryCurrency: 'AED',
    vatRatePercent: 5, // UAE FTA 5% VAT
    labourMaxDailyHours: 8, // UAE Labour Law
    summerOutdoorWorkRestriction: {
      enabled: true,
      startTime: '12:30',
      endTime: '15:00',
      startMonth: 6, // June 15
      endMonth: 9, // September 15
    },
    zatcaComplianceEnabled: false,
  },
};

export class CountryPackEngine {
  /**
   * Validates project operational and commercial compliance against country statutory laws.
   */
  static validateCompliance(input: {
    countryCode: string;
    shiftHours?: number;
    outdoorWorkTime?: string; // HH:mm
    outdoorWorkDate?: string; // YYYY-MM-DD
    invoiceTotal?: number;
    taxAmount?: number;
    sellerName?: string;
    vatNumber?: string;
  }): {
    countryCode: string;
    jurisdiction: string;
    isCompliant: boolean;
    violations: string[];
    zatcaQrCodeBase64?: string;
    vatValidationStatus: 'valid' | 'invalid_rate' | 'exempt' | 'not_applicable';
    labourValidationStatus: 'compliant' | 'fatigue_breach' | 'summer_work_ban_violation';
  } {
    const pack = CANONICAL_COUNTRY_PACKS[input.countryCode.toUpperCase()] || CANONICAL_COUNTRY_PACKS.QA;
    const violations: string[] = [];

    // 1. Labour Law Fatigue Validation
    let labourStatus: 'compliant' | 'fatigue_breach' | 'summer_work_ban_violation' = 'compliant';
    if (input.shiftHours !== undefined && input.shiftHours > pack.labourMaxDailyHours) {
      violations.push(
        `Shift duration of ${input.shiftHours}h violates statutory maximum daily working limit of ${pack.labourMaxDailyHours}h under ${pack.jurisdiction} Labour Law.`
      );
      labourStatus = 'fatigue_breach';
    }

    // Summer outdoor work restriction check
    if (pack.summerOutdoorWorkRestriction.enabled && input.outdoorWorkTime && input.outdoorWorkDate) {
      const month = new Date(input.outdoorWorkDate).getMonth() + 1;
      if (month >= pack.summerOutdoorWorkRestriction.startMonth && month <= pack.summerOutdoorWorkRestriction.endMonth) {
        if (
          input.outdoorWorkTime >= pack.summerOutdoorWorkRestriction.startTime &&
          input.outdoorWorkTime <= pack.summerOutdoorWorkRestriction.endTime
        ) {
          violations.push(
            `Outdoor work scheduled at ${input.outdoorWorkTime} violates summer outdoor working ban (${pack.summerOutdoorWorkRestriction.startTime} to ${pack.summerOutdoorWorkRestriction.endTime}) under ${pack.jurisdiction} safety regulations.`
          );
          labourStatus = 'summer_work_ban_violation';
        }
      }
    }

    // 2. VAT Validation
    let vatStatus: 'valid' | 'invalid_rate' | 'exempt' | 'not_applicable' = 'valid';
    if (input.invoiceTotal !== undefined && input.taxAmount !== undefined && input.invoiceTotal > 0) {
      const expectedTax = (input.invoiceTotal * pack.vatRatePercent) / 100;
      const diff = Math.abs(expectedTax - input.taxAmount);
      if (diff > 1.0) { // Tolerance of 1 unit
        violations.push(
          `Tax calculation mismatch: Invoice tax ${input.taxAmount} does not match ${pack.jurisdiction} statutory VAT rate of ${pack.vatRatePercent}% (Expected ${expectedTax.toFixed(2)} ${pack.primaryCurrency}).`
        );
        vatStatus = 'invalid_rate';
      }
    }

    // 3. ZATCA Phase 2 E-Invoicing QR Generator (Saudi Arabia)
    let zatcaQrBase64: string | undefined;
    if (pack.zatcaComplianceEnabled && input.sellerName && input.vatNumber && input.invoiceTotal) {
      zatcaQrBase64 = this.generateZatcaTlvBase64({
        sellerName: input.sellerName,
        vatNumber: input.vatNumber,
        timestamp: new Date().toISOString(),
        invoiceTotal: (input.invoiceTotal || 0).toFixed(2),
        vatTotal: (input.taxAmount || 0).toFixed(2),
      });
    }

    return {
      countryCode: pack.countryCode,
      jurisdiction: pack.jurisdiction,
      isCompliant: violations.length === 0,
      violations,
      zatcaQrCodeBase64: zatcaQrBase64,
      vatValidationStatus: vatStatus,
      labourValidationStatus: labourStatus,
    };
  }

  /**
   * Helper to format standard ZATCA TLV Base64 metadata.
   */
  private static generateZatcaTlvBase64(data: {
    sellerName: string;
    vatNumber: string;
    timestamp: string;
    invoiceTotal: string;
    vatTotal: string;
  }): string {
    const encodeTlv = (tag: number, val: string): Buffer => {
      const valBuf = Buffer.from(val, 'utf8');
      return Buffer.concat([Buffer.from([tag, valBuf.length]), valBuf]);
    };

    const b1 = encodeTlv(1, data.sellerName);
    const b2 = encodeTlv(2, data.vatNumber);
    const b3 = encodeTlv(3, data.timestamp);
    const b4 = encodeTlv(4, data.invoiceTotal);
    const b5 = encodeTlv(5, data.vatTotal);

    return Buffer.concat([b1, b2, b3, b4, b5]).toString('base64');
  }
}
