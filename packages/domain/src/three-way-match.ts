import { Money, CurrencyCode } from './money.js';

export interface PoLineItem {
  lineId: string;
  description: string;
  quantity: number;
  unitRate: number;
  totalCost: number;
}

export interface PurchaseOrderForMatch {
  id: string;
  currency: CurrencyCode;
  totalAmount: Money | string | number;
  remainingAmount: Money | string | number;
  isServicePo?: boolean;
  lines: PoLineItem[];
}

export interface ReceiptForMatch {
  receiptId: string;
  poId: string;
  poLineId?: string;
  acceptedQuantity: number;
  isSignedOff: boolean;
}

export interface InvoiceLineForMatch {
  lineId?: string;
  poLineId?: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  taxRate?: number;
}

export interface SupplierInvoiceForMatch {
  invoiceNumber: string;
  vendorId: string;
  currency: CurrencyCode;
  totalAmount: Money | string | number;
  lines: InvoiceLineForMatch[];
}

export interface ThreeWayMatchDiscrepancy {
  code: string;
  field: string;
  message: string;
  expected: string | number;
  actual: string | number;
}

export interface ThreeWayMatchResult {
  overallMatch: boolean;
  duplicateDetected: boolean;
  exceedsPoAmount: boolean;
  quantityMismatch: boolean;
  rateMismatch: boolean;
  taxMismatch: boolean;
  serviceUnacknowledged: boolean;
  discrepancyDetails: ThreeWayMatchDiscrepancy[];
}

export class ThreeWayMatchEngine {
  /**
   * Evaluates three-way match across Purchase Order, Goods/Service Receipts, and Supplier Invoice.
   * Discrepancies are flagged and prevent auto-approval.
   */
  static evaluateMatch(
    po: PurchaseOrderForMatch,
    receipts: ReceiptForMatch[],
    invoice: SupplierInvoiceForMatch,
    existingInvoices: Array<{ id: string; vendorId: string; invoiceNumber: string }> = [],
    options?: { allowedPriceVariancePercent?: number; standardTaxRatePercent?: number }
  ): ThreeWayMatchResult {
    const c = invoice.currency;
    const toMoney = (val: Money | string | number): Money =>
      val instanceof Money ? val : new Money(val, c);

    const discrepancies: ThreeWayMatchDiscrepancy[] = [];
    const priceTolerancePercent = options?.allowedPriceVariancePercent ?? 0;
    const standardTaxRate = options?.standardTaxRatePercent ?? 0;

    // 1. Duplicate Detection Check
    const isDuplicate = existingInvoices.some(
      (existing) =>
        existing.vendorId === invoice.vendorId &&
        existing.invoiceNumber.trim().toLowerCase() === invoice.invoiceNumber.trim().toLowerCase()
    );
    if (isDuplicate) {
      discrepancies.push({
        code: 'DUPLICATE_INVOICE',
        field: 'invoiceNumber',
        message: `Duplicate supplier invoice detected: invoice #${invoice.invoiceNumber} already exists for this vendor.`,
        expected: 'Unique invoice number',
        actual: invoice.invoiceNumber,
      });
    }

    // 2. Exceeds PO Amount Check
    const poRemaining = toMoney(po.remainingAmount);
    const invoiceTotal = toMoney(invoice.totalAmount);
    const exceedsPo = invoiceTotal.greaterThan(poRemaining);
    if (exceedsPo) {
      discrepancies.push({
        code: 'EXCEEDS_PO_AMOUNT',
        field: 'totalAmount',
        message: `Invoice total amount ${invoiceTotal.toString()} exceeds PO remaining unbilled commitment of ${poRemaining.toString()}.`,
        expected: poRemaining.toString(),
        actual: invoiceTotal.toString(),
      });
    }

    // 3. Service Unacknowledged Check
    let serviceUnacknowledged = false;
    if (po.isServicePo) {
      const hasSignedOffServiceReceipt = receipts.some(
        (r) => r.poId === po.id && r.isSignedOff
      );
      if (!hasSignedOffServiceReceipt) {
        serviceUnacknowledged = true;
        discrepancies.push({
          code: 'SERVICE_UNACKNOWLEDGED',
          field: 'receipts',
          message: `Service PO requires signed-off service delivery receipt or milestone signoff before invoice approval.`,
          expected: 'Signed-off service receipt present',
          actual: 'None found',
        });
      }
    }

    // 4. Line-by-Line Quantity and Rate Mismatch Checks
    let quantityMismatch = false;
    let rateMismatch = false;
    let taxMismatch = false;

    for (const invLine of invoice.lines) {
      const poLine = po.lines.find(
        (pl) => pl.lineId === invLine.poLineId || pl.description === invLine.description
      );

      if (!poLine) {
        discrepancies.push({
          code: 'UNMATCHED_INVOICE_LINE',
          field: 'poLineId',
          message: `Invoice line "${invLine.description}" does not correspond to any line on PO ${po.id}.`,
          expected: 'Valid PO Line ID',
          actual: invLine.description,
        });
        rateMismatch = true;
        continue;
      }

      // Quantity check against receipts (or PO line if no separate receipts)
      const matchingReceipts = receipts.filter(
        (r) => r.poId === po.id && (r.poLineId === poLine.lineId || !r.poLineId)
      );
      const totalReceivedQuantity = matchingReceipts.reduce(
        (sum, r) => sum + r.acceptedQuantity,
        0
      );

      const maxAllowedQuantity = matchingReceipts.length > 0 ? totalReceivedQuantity : poLine.quantity;
      if (invLine.quantity > maxAllowedQuantity) {
        quantityMismatch = true;
        discrepancies.push({
          code: 'QUANTITY_MISMATCH',
          field: `lines[${invLine.description}].quantity`,
          message: `Invoiced quantity (${invLine.quantity}) exceeds received/authorized quantity (${maxAllowedQuantity}) for "${invLine.description}".`,
          expected: maxAllowedQuantity,
          actual: invLine.quantity,
        });
      }

      // Unit Rate check
      const maxAllowedUnitRate = poLine.unitRate * (1 + priceTolerancePercent / 100);
      if (invLine.unitCost > maxAllowedUnitRate) {
        rateMismatch = true;
        discrepancies.push({
          code: 'RATE_MISMATCH',
          field: `lines[${invLine.description}].unitCost`,
          message: `Invoiced unit cost (${invLine.unitCost}) exceeds agreed PO line rate (${poLine.unitRate}) by more than allowed variance.`,
          expected: poLine.unitRate,
          actual: invLine.unitCost,
        });
      }

      // Tax Rate check
      if (invLine.taxRate !== undefined && standardTaxRate > 0 && invLine.taxRate > standardTaxRate) {
        taxMismatch = true;
        discrepancies.push({
          code: 'TAX_MISMATCH',
          field: `lines[${invLine.description}].taxRate`,
          message: `Invoiced tax rate (${invLine.taxRate}%) exceeds jurisdiction standard tax rate (${standardTaxRate}%).`,
          expected: standardTaxRate,
          actual: invLine.taxRate,
        });
      }
    }

    const overallMatch =
      !isDuplicate &&
      !exceedsPo &&
      !quantityMismatch &&
      !rateMismatch &&
      !taxMismatch &&
      !serviceUnacknowledged;

    return {
      overallMatch,
      duplicateDetected: isDuplicate,
      exceedsPoAmount: exceedsPo,
      quantityMismatch,
      rateMismatch,
      taxMismatch,
      serviceUnacknowledged,
      discrepancyDetails: discrepancies,
    };
  }
}
