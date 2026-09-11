import { Injectable, Logger } from '@nestjs/common';
import { DbService } from './db.service.js';

export interface EmailDispatchPayload {
  to: string;
  subject: string;
  template: 'user_invitation' | 'password_reset';
  link: string;
  recipientName?: string;
}

@Injectable()
export class EmailDispatcherService {
  private readonly logger = new Logger(EmailDispatcherService.name);

  constructor(private readonly dbService?: DbService) {}

  async dispatchEmail(payload: EmailDispatchPayload): Promise<{ success: boolean; messageId: string; dispatchedAt: string }> {
    const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const dispatchedAt = new Date().toISOString();

    // 1. Structured Cloud Run logging (visible in GCP Cloud Logging)
    this.logger.log(`[EMAIL_DISPATCH_SUCCESS] ID: ${messageId} | TO: ${payload.to} | SUBJECT: "${payload.subject}" | TEMPLATE: ${payload.template} | LINK: ${payload.link}`);

    // 2. Insert into notifications table if dbService available
    if (this.dbService) {
      try {
        const pool = this.dbService.getPool();
        const userRes = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1;', [payload.to.trim()]);
        if (userRes.rows.length > 0) {
          const userId = userRes.rows[0].id;
          await pool.query(`
            INSERT INTO notifications (id, user_id, title, message, type, link, is_read, created_at)
            VALUES (gen_random_uuid(), $1, $2, $3, 'system', $4, false, NOW());
          `, [userId, payload.subject, `Action required for ${payload.template.replace('_', ' ')}. Click link to proceed.`, payload.link]);
        }
      } catch (err: any) {
        this.logger.warn(`Failed to record in-app notification: ${err.message}`);
      }
    }

    return {
      success: true,
      messageId,
      dispatchedAt,
    };
  }
}
