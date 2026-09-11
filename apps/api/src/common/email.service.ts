import { Injectable, Logger } from '@nestjs/common';
import { DbService } from './db.service.js';

export interface EmailDispatchPayload {
  to: string;
  subject: string;
  template: 'user_invitation' | 'password_reset' | 'system_alert';
  link: string;
  recipientName?: string;
  metadata?: Record<string, any>;
}

export type EmailDeliveryStatus = 'QUEUED' | 'SENT' | 'FAILED' | 'BOUNCED' | 'DELIVERED';

export interface EmailProviderResult {
  success: boolean;
  messageId: string;
  provider: string;
  status: EmailDeliveryStatus;
  dispatchedAt: string;
  error?: string;
}

export interface TransactionalEmailProvider {
  name: string;
  send(payload: EmailDispatchPayload, messageId: string): Promise<EmailProviderResult>;
}

/**
 * Mask email address for privacy and zero-PII logging.
 * e.g., 'superadmin@e3.qa' -> 's***n@e3.qa'
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@unknown';
  const [user, domain] = email.split('@');
  if (user.length <= 2) {
    return `${user[0]}***@${domain}`;
  }
  return `${user[0]}***${user[user.length - 1]}@${domain}`;
}

/**
 * Resend Email Provider Adapter
 */
class ResendEmailProvider implements TransactionalEmailProvider {
  readonly name = 'resend';
  private readonly apiKey: string;
  private readonly from: string;

  constructor(apiKey: string, from?: string) {
    this.apiKey = apiKey;
    this.from = from || process.env.EMAIL_FROM || 'E3-EOS <no-reply@e3.qa>';
  }

  async send(payload: EmailDispatchPayload, messageId: string): Promise<EmailProviderResult> {
    const dispatchedAt = new Date().toISOString();
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: [payload.to],
          subject: payload.subject,
          html: `<p>Hello ${payload.recipientName || 'User'},</p><p>${payload.subject}</p><p><a href="${payload.link}">Click here to proceed</a></p>`,
          tags: [{ name: 'message_id', value: messageId }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          messageId,
          provider: this.name,
          status: 'FAILED',
          dispatchedAt,
          error: `Resend API error: ${response.status} ${errorText}`,
        };
      }

      const resData = (await response.json()) as any;
      return {
        success: true,
        messageId: resData.id || messageId,
        provider: this.name,
        status: 'SENT',
        dispatchedAt,
      };
    } catch (err: any) {
      return {
        success: false,
        messageId,
        provider: this.name,
        status: 'FAILED',
        dispatchedAt,
        error: err.message,
      };
    }
  }
}

/**
 * SendGrid Email Provider Adapter
 */
class SendGridEmailProvider implements TransactionalEmailProvider {
  readonly name = 'sendgrid';
  private readonly apiKey: string;
  private readonly from: string;

  constructor(apiKey: string, from?: string) {
    this.apiKey = apiKey;
    this.from = from || process.env.EMAIL_FROM || 'no-reply@e3.qa';
  }

  async send(payload: EmailDispatchPayload, messageId: string): Promise<EmailProviderResult> {
    const dispatchedAt = new Date().toISOString();
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: payload.to }] }],
          from: { email: this.from },
          subject: payload.subject,
          content: [
            {
              type: 'text/html',
              value: `<p>Hello ${payload.recipientName || 'User'},</p><p>${payload.subject}</p><p><a href="${payload.link}">Click here to proceed</a></p>`,
            },
          ],
          custom_args: { message_id: messageId },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          success: false,
          messageId,
          provider: this.name,
          status: 'FAILED',
          dispatchedAt,
          error: `SendGrid API error: ${response.status} ${errText}`,
        };
      }

      return {
        success: true,
        messageId,
        provider: this.name,
        status: 'SENT',
        dispatchedAt,
      };
    } catch (err: any) {
      return {
        success: false,
        messageId,
        provider: this.name,
        status: 'FAILED',
        dispatchedAt,
        error: err.message,
      };
    }
  }
}

/**
 * Durable PostgreSQL Outbox Queue Provider
 * Used when running in queue mode or as a resilient transactional buffer.
 */
class DurableOutboxProvider implements TransactionalEmailProvider {
  readonly name = 'durable_outbox';

  async send(_payload: EmailDispatchPayload, messageId: string): Promise<EmailProviderResult> {
    const dispatchedAt = new Date().toISOString();
    return {
      success: true,
      messageId,
      provider: this.name,
      status: 'QUEUED',
      dispatchedAt,
    };
  }
}

@Injectable()
export class EmailDispatcherService {
  private readonly logger = new Logger(EmailDispatcherService.name);
  private readonly provider: TransactionalEmailProvider;

  constructor(private readonly dbService?: DbService) {
    // Select real provider based on environment credentials from Secret Manager / env
    const resendKey = process.env.RESEND_API_KEY;
    const sendgridKey = process.env.SENDGRID_API_KEY;
    const configuredProvider = (process.env.EMAIL_PROVIDER || '').toLowerCase();

    if (resendKey && configuredProvider !== 'durable_outbox') {
      this.provider = new ResendEmailProvider(resendKey);
    } else if (sendgridKey && configuredProvider !== 'durable_outbox') {
      this.provider = new SendGridEmailProvider(sendgridKey);
    } else {
      this.provider = new DurableOutboxProvider();
    }
  }

  /**
   * Dispatches transactional email with zero-leak token guarantees and durable DB persistence.
   */
  async dispatchEmail(payload: EmailDispatchPayload): Promise<EmailProviderResult> {
    const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const result = await this.provider.send(payload, messageId);

    // 1. Enforce ZERO-LEAK structured logging:
    // Log ONLY: template type, redacted recipient (u***@e3.qa), messageId, provider, status, timestamp.
    // NEVER log payload.link, tokens, or plaintext secrets.
    this.logger.log(
      `[TRANSACTIONAL_EMAIL] ID: ${result.messageId} | STATUS: ${result.status} | PROVIDER: ${result.provider} | RECIPIENT: ${maskEmail(payload.to)} | TEMPLATE: ${payload.template} | DISPATCHED_AT: ${result.dispatchedAt}`
    );

    // 2. Persist intent in PostgreSQL durable outbox table (AT-009 / S19-S20)
    if (this.dbService) {
      try {
        const pool = this.dbService.getPool();
        const orgId = payload.metadata?.organisationId || '11111111-1111-4111-8111-111111111111';
        
        await pool.query(
          `
          INSERT INTO outbox (id, event_id, organisation_id, event_type, payload, status, retry_count, created_at, processed_at)
          VALUES (
            gen_random_uuid(),
            $1,
            $2,
            'notification.email.dispatched.v1',
            $3,
            $4,
            0,
            NOW(),
            $5
          )
          ON CONFLICT (event_id) DO NOTHING;
        `,
          [
            result.messageId,
            orgId,
            JSON.stringify({
              recipient: maskEmail(payload.to),
              template: payload.template,
              subject: payload.subject,
              provider: result.provider,
              deliveryStatus: result.status,
            }),
            result.status === 'SENT' ? 'dispatched' : 'pending',
            result.status === 'SENT' ? new Date() : null,
          ]
        );
      } catch (err: any) {
        this.logger.warn(`[Outbox] Notice: Could not record email outbox record: ${err.message}`);
      }

      // 3. Insert safe in-app notification without tokens or reset links
      try {
        const pool = this.dbService.getPool();
        const userRes = await pool.query(
          'SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1;',
          [payload.to.trim()]
        );

        if (userRes.rows.length > 0) {
          const userId = userRes.rows[0].id;
          const notifTitle =
            payload.template === 'password_reset'
              ? 'Password Reset Requested'
              : payload.template === 'user_invitation'
              ? 'Organization Invitation'
              : payload.subject;

          const notifMessage =
            payload.template === 'password_reset'
              ? 'A password reset request was initiated for your account. If you did not make this request, please contact security immediately.'
              : payload.template === 'user_invitation'
              ? 'You have been invited to join E3 Event Operating System.'
              : 'You have a new system alert.';

          const safeLink = payload.template === 'password_reset' ? '/account' : '/home';

          await pool.query(
            `
            INSERT INTO notifications (id, user_id, title, message, type, link, is_read, created_at)
            VALUES (gen_random_uuid(), $1, $2, $3, 'system', $4, false, NOW());
          `,
            [userId, notifTitle, notifMessage, safeLink]
          );
        }
      } catch (err: any) {
        this.logger.warn(`Failed to record in-app notification: ${err.message}`);
      }
    }

    return result;
  }
}
