import { CurrencyCode } from './money.js';

export interface HistoricalProjectRecord {
  id: string;
  projectCode: string;
  title: string;
  eventType: string; // summit, festival, exhibition, sports_ceremony, corporate_gala
  venueType: string; // indoor_arena, outdoor_stadium, convention_centre, public_park
  scaleCapacity: number;
  durationDays: number;
  countryCode: string;
  totalDirectCost: number;
  currency: CurrencyCode;
  actualGrossMarginPercent: number;
  baselineGrossMarginPercent: number;
  completionDate: Date;
  categorySpend: {
    audio: number;
    scenic: number;
    lighting: number;
    video: number;
    rigging: number;
    labor: number;
    logistics: number;
  };
}

export interface ParametricForecastResult {
  currency: CurrencyCode;
  targetCapacity: number;
  durationDays: number;
  sampleSize: number;
  evidenceAgeDays: number;
  p25LowCost: string;
  p50MedianCost: string;
  p75HighCost: string;
  costPerCapacityUnit: string;
  categorySpendBreakdown: Array<{
    category: string;
    percentage: number;
    benchmarkAmount: string;
  }>;
  marginErosionRiskIndexPercent: string;
  riskDrivers: string[];
}

export class HistoricalEstimatingEngine {
  /**
   * Identifies comparable historical projects using multi-attribute similarity scoring.
   */
  static findSimilarProjects(
    criteria: {
      eventType: string;
      venueType: string;
      targetCapacity: number;
      durationDays: number;
      targetCountry?: string;
    },
    dataset: HistoricalProjectRecord[]
  ): Array<{ project: HistoricalProjectRecord; similarityScore: number }> {
    return dataset
      .map((record) => {
        let score = 0;
        // Event type match (weight 40%)
        if (record.eventType.toLowerCase() === criteria.eventType.toLowerCase()) {
          score += 40;
        }
        // Venue type match (weight 25%)
        if (record.venueType.toLowerCase() === criteria.venueType.toLowerCase()) {
          score += 25;
        }
        // Capacity scale similarity (weight 20%)
        const capDiff = Math.abs(record.scaleCapacity - criteria.targetCapacity);
        const capRatio = Math.max(0, 1 - capDiff / Math.max(record.scaleCapacity, criteria.targetCapacity));
        score += capRatio * 20;

        // Duration similarity (weight 10%)
        const durDiff = Math.abs(record.durationDays - criteria.durationDays);
        const durRatio = Math.max(0, 1 - durDiff / Math.max(record.durationDays, criteria.durationDays));
        score += durRatio * 10;

        // Country match (weight 5%)
        if (criteria.targetCountry && record.countryCode.toLowerCase() === criteria.targetCountry.toLowerCase()) {
          score += 5;
        }

        return { project: record, similarityScore: Math.round(score) };
      })
      .filter((item) => item.similarityScore >= 35)
      .sort((a, b) => b.similarityScore - a.similarityScore);
  }

  /**
   * Generates statistical parametric forecast with evidence age and sample disclosures (AT-080).
   */
  static calculateParametricForecast(
    similar: Array<{ project: HistoricalProjectRecord; similarityScore: number }>,
    targetCapacity: number,
    durationDays: number,
    currency: CurrencyCode = 'QAR'
  ): ParametricForecastResult {
    if (similar.length === 0) {
      return {
        currency,
        targetCapacity,
        durationDays,
        sampleSize: 0,
        evidenceAgeDays: 0,
        p25LowCost: '0',
        p50MedianCost: '0',
        p75HighCost: '0',
        costPerCapacityUnit: '0',
        categorySpendBreakdown: [],
        marginErosionRiskIndexPercent: '0.00%',
        riskDrivers: ['Insufficient historical sample size for parametric modeling.'],
      };
    }

    // Normalized cost per attendee-day
    const unitCosts = similar.map((s) => {
      const denom = s.project.scaleCapacity * s.project.durationDays;
      return denom > 0 ? s.project.totalDirectCost / denom : 0;
    }).sort((a, b) => a - b);

    const medianUnitCost = unitCosts[Math.floor(unitCosts.length / 2)] || 100;
    const p25UnitCost = unitCosts[Math.floor(unitCosts.length * 0.25)] || medianUnitCost * 0.85;
    const p75UnitCost = unitCosts[Math.floor(unitCosts.length * 0.75)] || medianUnitCost * 1.2;

    const totalUnits = targetCapacity * durationDays;
    const p25Total = Math.round(p25UnitCost * totalUnits);
    const p50Total = Math.round(medianUnitCost * totalUnits);
    const p75Total = Math.round(p75UnitCost * totalUnits);

    // Compute average category spend percentages
    const categories = ['audio', 'scenic', 'lighting', 'video', 'rigging', 'labor', 'logistics'] as const;
    const catSums: Record<string, number> = {};
    for (const c of categories) catSums[c] = 0;

    let totalSpend = 0;
    for (const s of similar) {
      for (const c of categories) {
        catSums[c] += s.project.categorySpend[c] || 0;
        totalSpend += s.project.categorySpend[c] || 0;
      }
    }

    const breakdown = categories.map((c) => {
      const pct = totalSpend > 0 ? (catSums[c] / totalSpend) * 100 : 0;
      const amt = Math.round((p50Total * pct) / 100);
      return {
        category: c.toUpperCase(),
        percentage: Math.round(pct * 10) / 10,
        benchmarkAmount: amt.toLocaleString() + ' ' + currency,
      };
    });

    // Compute Margin Erosion Risk
    // Historical margin variance = baseline margin - actual margin
    let totalMarginErosion = 0;
    for (const s of similar) {
      const erosion = Math.max(0, s.project.baselineGrossMarginPercent - s.project.actualGrossMarginPercent);
      totalMarginErosion += erosion;
    }
    const avgErosion = totalMarginErosion / similar.length;
    const riskPercent = avgErosion.toFixed(2) + '%';

    const riskDrivers: string[] = [];
    if (avgErosion > 5) {
      riskDrivers.push('Historical precedent shows significant variation scope creep in comparable venue types.');
    }
    if (durationDays <= 2 && targetCapacity >= 5000) {
      riskDrivers.push('Compressed live runtime with high attendee density increases overtime and site logistics premiums.');
    }
    if (riskDrivers.length === 0) {
      riskDrivers.push('Stable historical cost predictability across selected parameters.');
    }

    // Average evidence age
    const now = Date.now();
    const avgAgeDays = Math.round(
      similar.reduce((acc, s) => acc + (now - s.project.completionDate.getTime()) / (1000 * 3600 * 24), 0) /
        similar.length
    );

    return {
      currency,
      targetCapacity,
      durationDays,
      sampleSize: similar.length,
      evidenceAgeDays: avgAgeDays,
      p25LowCost: p25Total.toLocaleString() + ' ' + currency,
      p50MedianCost: p50Total.toLocaleString() + ' ' + currency,
      p75HighCost: p75Total.toLocaleString() + ' ' + currency,
      costPerCapacityUnit: Math.round(medianUnitCost).toLocaleString() + ' ' + currency + '/attendee-day',
      categorySpendBreakdown: breakdown,
      marginErosionRiskIndexPercent: riskPercent,
      riskDrivers,
    };
  }
}
