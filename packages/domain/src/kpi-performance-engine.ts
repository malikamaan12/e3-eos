export interface KpiDefinition {
  kpiCode: string;
  name: string;
  targetValue: number;
  actualValue: number;
  unit: string;
  comparison: 'greater_than_or_equal' | 'less_than_or_equal' | 'exact';
  tolerancePercent?: number;
}

export interface KpiEvaluationResult {
  kpiCode: string;
  name: string;
  status: 'met' | 'partially_met' | 'missed';
  achievementPercent: number;
  variance: number;
  formattedActual: string;
  formattedTarget: string;
}

export interface VendorScorecardInput {
  vendorId: string;
  vendorName: string;
  priceScore: number; // 1-100 or 1-5
  qualityScore: number;
  deliveryScore: number;
  responsivenessScore: number;
  hseScore: number;
}

export interface VendorScorecardResult {
  vendorId: string;
  vendorName: string;
  averageScore: number;
  letterGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  isRecommended: boolean;
  breakdown: {
    price: number;
    quality: number;
    delivery: number;
    responsiveness: number;
    hse: number;
  };
}

export class KpiPerformanceEngine {
  /**
   * Evaluates a project performance KPI against defined targets and tolerances.
   */
  static evaluateKpi(def: KpiDefinition): KpiEvaluationResult {
    const tolerance = def.tolerancePercent ?? 5;
    let status: 'met' | 'partially_met' | 'missed' = 'missed';
    let achievementPercent = 0;
    const variance = def.actualValue - def.targetValue;

    if (def.comparison === 'greater_than_or_equal') {
      achievementPercent = def.targetValue > 0 ? (def.actualValue / def.targetValue) * 100 : 100;
      if (def.actualValue >= def.targetValue) {
        status = 'met';
      } else if (achievementPercent >= 100 - tolerance) {
        status = 'partially_met';
      } else {
        status = 'missed';
      }
    } else if (def.comparison === 'less_than_or_equal') {
      // e.g. incidents, delays
      if (def.actualValue <= def.targetValue) {
        status = 'met';
        achievementPercent = 100;
      } else {
        const excess = def.actualValue - def.targetValue;
        achievementPercent = Math.max(0, 100 - (excess / (def.targetValue || 1)) * 100);
        status = achievementPercent >= 100 - tolerance ? 'partially_met' : 'missed';
      }
    } else {
      achievementPercent = def.targetValue > 0 ? (1 - Math.abs(variance) / def.targetValue) * 100 : 100;
      status = Math.abs(variance) === 0 ? 'met' : achievementPercent >= 95 ? 'partially_met' : 'missed';
    }

    return {
      kpiCode: def.kpiCode,
      name: def.name,
      status,
      achievementPercent: Math.round(achievementPercent * 100) / 100,
      variance,
      formattedActual: `${def.actualValue} ${def.unit}`,
      formattedTarget: `${def.targetValue} ${def.unit}`,
    };
  }

  /**
   * Generates a composite vendor performance evaluation score and recommendation.
   */
  static scoreVendor(input: VendorScorecardInput): VendorScorecardResult {
    const scores = [
      input.priceScore,
      input.qualityScore,
      input.deliveryScore,
      input.responsivenessScore,
      input.hseScore,
    ];
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const roundedAvg = Math.round(avg * 10) / 10;

    let letterGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'C';
    if (roundedAvg >= 95) letterGrade = 'A+';
    else if (roundedAvg >= 85) letterGrade = 'A';
    else if (roundedAvg >= 75) letterGrade = 'B';
    else if (roundedAvg >= 65) letterGrade = 'C';
    else if (roundedAvg >= 50) letterGrade = 'D';
    else letterGrade = 'F';

    return {
      vendorId: input.vendorId,
      vendorName: input.vendorName,
      averageScore: roundedAvg,
      letterGrade,
      isRecommended: roundedAvg >= 70,
      breakdown: {
        price: input.priceScore,
        quality: input.qualityScore,
        delivery: input.deliveryScore,
        responsiveness: input.responsivenessScore,
        hse: input.hseScore,
      },
    };
  }
}
