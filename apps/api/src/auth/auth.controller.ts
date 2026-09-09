import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpException,
  HttpStatus,
  UseFilters,
  Optional,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProblemDetailsFilter } from '../common/problem.filter.js';
import { DbService } from '../common/db.service.js';
import crypto from 'crypto';

interface LoginDto {
  email: string;
  password?: string;
}

@Controller('auth')
@UseFilters(ProblemDetailsFilter)
export class AuthController {
  private dbService: DbService;
  constructor(@Optional() dbService?: DbService) {
    this.dbService = dbService || new DbService();
  }

  @Post('login')
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    if (!body.email) {
      throw new HttpException({ title: 'Validation Error', detail: 'Email is required' }, HttpStatus.BAD_REQUEST);
    }

    const pool = this.dbService.getPool();
    const userRes = await pool.query(`
      SELECT u.id, u.email, u.name, u.is_super_admin, m.role, m.audience, m.organisation_id, o.name as org_name
      FROM users u
      LEFT JOIN memberships m ON m.user_id = u.id AND m.is_revoked = false
      LEFT JOIN organisations o ON o.id = m.organisation_id
      WHERE LOWER(u.email) = LOWER($1)
      LIMIT 1;
    `, [body.email.trim()]);

    if (userRes.rows.length === 0) {
      throw new HttpException({ title: 'Unauthorized', detail: 'Invalid credentials' }, HttpStatus.UNAUTHORIZED);
    }

    const user = userRes.rows[0];
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.query(`
      INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
    `, [user.id, sessionToken, expiresAt, '127.0.0.1', 'E3-EOS Web']);

    // Set HTTP-only session cookie
    res.cookie('eos_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });

    return {
      success: true,
      sessionToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isSuperAdmin: user.is_super_admin,
      },
      activeMembership: {
        role: user.role || 'viewer',
        audience: user.audience || 'internal',
        organisationId: user.organisation_id || '11111111-1111-4111-8111-111111111111',
        organisationName: user.org_name || 'E3 Events',
      },
    };
  }

  @Get('me')
  async getMe(@Req() req: Request) {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.['eos_session'];
    const token = authHeader?.replace('Bearer ', '') || cookieToken;

    const pool = this.dbService.getPool();

    if (token) {
      const sessionRes = await pool.query(`
        SELECT s.token, s.expires_at, u.id, u.email, u.name, u.is_super_admin,
               m.role, m.audience, m.organisation_id, o.name as org_name
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        LEFT JOIN memberships m ON m.user_id = u.id AND m.is_revoked = false
        LEFT JOIN organisations o ON o.id = m.organisation_id
        WHERE s.token = $1 AND s.expires_at > NOW()
        LIMIT 1;
      `, [token]);

      if (sessionRes.rows.length > 0) {
        const row = sessionRes.rows[0];
        return {
          authenticated: true,
          user: {
            id: row.id,
            email: row.email,
            name: row.name,
            isSuperAdmin: row.is_super_admin,
          },
          activeMembership: {
            role: row.role || 'viewer',
            audience: row.audience || 'internal',
            organisationId: row.organisation_id || '11111111-1111-4111-8111-111111111111',
            organisationName: row.org_name || 'E3 Events',
          },
        };
      }
    }

    // Default development fallback when unauthenticated
    return {
      authenticated: false,
      user: null,
      activeMembership: null,
    };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookieToken = req.cookies?.['eos_session'];
    const authHeader = req.headers.authorization;
    const token = cookieToken || authHeader?.replace('Bearer ', '');

    if (token) {
      const pool = this.dbService.getPool();
      await pool.query('DELETE FROM sessions WHERE token = $1;', [token]);
    }

    res.clearCookie('eos_session', { path: '/' });
    return { success: true, message: 'Logged out successfully' };
  }
}
