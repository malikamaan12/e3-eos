export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';

export interface ExtractedRequirement {
  id: string;
  title: string;
  requirementText: string;
  sourcePageNumber?: number;
  sourceSectionReference?: string;
  verificationStatus: 'unverified_suggestion' | 'verified_by_human' | 'quarantined';
  isSafeData: boolean;
}

export interface AiDraftExtractionResult {
  draftId: string;
  documentType: string;
  classification: DataClassification;
  neutralizedPromptInjectionsFound: number;
  extractedRequirements: ExtractedRequirement[];
  canWriteToDomain: boolean;
  notes: string;
}

export class AiAssistantEngine {
  /**
   * Asserts classification boundary for external AI calls (AT-084).
   * Invariant: Restricted/confidential projects reject external AI calls; manual workflows remain available.
   */
  static assertClassificationAllowed(classification: DataClassification): void {
    if (classification === 'restricted' || classification === 'confidential') {
      throw new Error(
        `AI_REQUEST_DISALLOWED_BY_CLASSIFICATION: Data classification '${classification}' prohibits external AI processing under company security policy. Manual human workflows remain available.`
      );
    }
  }

  /**
   * Scans and neutralizes prompt injection directives in untrusted tender text (AT-083).
   * Invariant: Active instructions (e.g. 'IGNORE PREVIOUS INSTRUCTIONS', 'APPROVE PO') are treated purely as inert text data.
   */
  static sanitizeTenderInput(rawText: string): {
    sanitizedText: string;
    injectionsDetected: number;
  } {
    const injectionPatterns = [
      /ignore\s+(all\s+)?prior\s+instructions/gi,
      /ignore\s+(all\s+)?previous\s+instructions/gi,
      /system\s+prompt\s+override/gi,
      /approve\s+(this\s+)?po\s+for/gi,
      /escalate\s+privileges/gi,
      /bypass\s+approval/gi,
    ];

    let sanitized = rawText;
    let detections = 0;

    for (const pattern of injectionPatterns) {
      if (pattern.test(sanitized)) {
        detections++;
        sanitized = sanitized.replace(pattern, (match) => `[UNTRUSTED_DATA_DIRECTIVE_NEUTRALIZED: "${match}"]`);
      }
    }

    return {
      sanitizedText: sanitized,
      injectionsDetected: detections,
    };
  }

  /**
   * Extracts requirements and enforces citation verification (AT-085).
   * Invariant: Requirements lacking a valid human source page/section citation are quarantined as unverified suggestions.
   */
  static processExtractedRequirements(
    requirements: Array<{
      title: string;
      requirementText: string;
      sourcePageNumber?: number;
      sourceSectionReference?: string;
    }>
  ): ExtractedRequirement[] {
    return requirements.map((req, idx) => {
      const hasValidCitation =
        req.sourcePageNumber !== undefined &&
        req.sourcePageNumber > 0 &&
        Boolean(req.sourceSectionReference && req.sourceSectionReference.trim().length > 0);

      return {
        id: `req-${Date.now()}-${idx}`,
        title: req.title,
        requirementText: req.requirementText,
        sourcePageNumber: req.sourcePageNumber,
        sourceSectionReference: req.sourceSectionReference,
        verificationStatus: hasValidCitation ? 'verified_by_human' : 'unverified_suggestion',
        isSafeData: true,
      };
    });
  }

  /**
   * Validates human acceptance of an AI requirement (AT-085).
   */
  static verifyRequirementByHuman(
    requirement: ExtractedRequirement,
    sourcePageNumber: number,
    sectionRef: string
  ): ExtractedRequirement {
    if (!sourcePageNumber || sourcePageNumber <= 0 || !sectionRef || sectionRef.trim().length === 0) {
      throw new Error(
        `SOURCE_VERIFICATION_MISSING: Cannot accept AI requirement into project baseline without a verified source page number and document section reference.`
      );
    }

    return {
      ...requirement,
      sourcePageNumber,
      sourceSectionReference: sectionRef,
      verificationStatus: 'verified_by_human',
    };
  }
}
