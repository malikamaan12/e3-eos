/**
 * RFC 7807 / RFC 9457 Problem Details Document
 */
export interface ProblemDetail {
  type: string; // URI e.g. "urn:e3-eos:problem:approval-required"
  title: string;
  status: number; // HTTP status code
  detail?: string;
  code: string; // Machine-readable string error code
  requestId: string;
  invalidParams?: Array<{
    name: string;
    reason: string;
  }>;
  conditions?: Array<{
    ruleId: string;
    state: 'unmet' | 'unknown' | 'failed';
  }>;
  permittedNextActions?: string[];
}

export class ProblemDocumentFactory {
  static create(params: {
    type?: string;
    title: string;
    status: number;
    code: string;
    detail?: string;
    requestId: string;
    invalidParams?: ProblemDetail['invalidParams'];
    conditions?: ProblemDetail['conditions'];
    permittedNextActions?: string[];
  }): ProblemDetail {
    return {
      type: params.type || `urn:e3-eos:problem:${params.code.toLowerCase().replace(/_/g, '-')}`,
      title: params.title,
      status: params.status,
      detail: params.detail,
      code: params.code,
      requestId: params.requestId,
      invalidParams: params.invalidParams,
      conditions: params.conditions,
      permittedNextActions: params.permittedNextActions,
    };
  }
}
