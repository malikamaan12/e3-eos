import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

export interface UploadIntentRequest {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  purpose: 'design_brief' | 'permit_evidence' | 'site_survey' | 'contract';
}

export interface UploadIntentResponse {
  uploadId: string;
  quarantineStorageKey: string;
  status: 'quarantined' | 'rejected';
  maxSizeBytes: number;
}

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
]);

const PROHIBITED_EXTENSIONS = ['.exe', '.sh', '.bat', '.cmd', '.js', '.vbs', '.docm', '.xlsm', '.svg'];

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB

@Injectable()
export class DocumentQuarantineService {
  requestUploadIntent(req: UploadIntentRequest): UploadIntentResponse {
    // Check size limit (AT-008)
    if (req.sizeBytes > MAX_UPLOAD_SIZE) {
      throw new HttpException(
        {
          code: 'UPLOAD_TOO_LARGE',
          title: 'File exceeds maximum upload size',
          detail: `Upload size ${req.sizeBytes} exceeds maximum permitted size of ${MAX_UPLOAD_SIZE} bytes.`,
        },
        HttpStatus.BAD_REQUEST
      );
    }

    // Check prohibited extensions / MIME types (AT-008)
    const lowerFilename = req.filename.toLowerCase();
    const isProhibited = PROHIBITED_EXTENSIONS.some((ext) => lowerFilename.endsWith(ext));
    if (isProhibited || !ALLOWED_MIME_TYPES.has(req.mimeType)) {
      throw new HttpException(
        {
          code: 'PROHIBITED_FILE_TYPE',
          title: 'File type is not permitted',
          detail: `MIME type ${req.mimeType} or extension in ${req.filename} is prohibited for security reasons.`,
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    return {
      uploadId,
      quarantineStorageKey: `quarantine/${uploadId}/${req.filename}`,
      status: 'quarantined',
      maxSizeBytes: MAX_UPLOAD_SIZE,
    };
  }
}
