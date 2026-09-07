import { CurrencyCode } from './money.js';

export interface RegionalCell {
  cellCode: string; // e.g. 'CELL-QA', 'CELL-AE'
  countryCode: string; // e.g. 'QA', 'AE'
  jurisdiction: string; // e.g. 'State of Qatar', 'United Arab Emirates'
  primaryCurrency: CurrencyCode; // e.g. 'QAR', 'AED'
  dataProcessingRegion: string; // e.g. 'me-central1-doha', 'me-west1-dubai'
  status: 'active' | 'under_review' | 'disabled';
}

export class CountryCellEngine {
  /**
   * Asserts isolation and review boundaries between regional cells (AT-086).
   * Invariant: Cross-cell resource allocation or data migration cannot happen implicitly;
   * requires explicit bilateral jurisdiction approval.
   */
  static validateCrossCellAllocation(
    sourceCell: RegionalCell,
    targetCell: RegionalCell,
    isCrossCellApproved: boolean
  ): { isPermitted: boolean; reason?: string } {
    if (sourceCell.cellCode === targetCell.cellCode) {
      return { isPermitted: true };
    }

    if (!isCrossCellApproved) {
      throw new Error(
        `CROSS_CELL_ALLOCATION_PROHIBITED: Attempted allocation between cell ${sourceCell.cellCode} (${sourceCell.jurisdiction}) and cell ${targetCell.cellCode} (${targetCell.jurisdiction}) without bilateral compliance review and data processing authorization.`
      );
    }

    return {
      isPermitted: true,
      reason: `Authorized cross-cell operation between ${sourceCell.cellCode} and ${targetCell.cellCode} under reviewed regional data policy.`,
    };
  }
}
