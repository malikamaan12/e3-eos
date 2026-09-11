#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const pg = require(require.resolve('pg', { paths: [path.join(__dirname, '../packages/db'), process.cwd()] }));

// Zero-dependency scrypt password hashing matching @e3-eos/db
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

function generateSecurePassword(length = 20) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*()-_=+[]{}';
  const all = upper + lower + digits + symbols;

  let pwd = '';
  pwd += upper[crypto.randomInt(0, upper.length)];
  pwd += lower[crypto.randomInt(0, lower.length)];
  pwd += digits[crypto.randomInt(0, digits.length)];
  pwd += symbols[crypto.randomInt(0, symbols.length)];

  for (let i = 4; i < length; i++) {
    pwd += all[crypto.randomInt(0, all.length)];
  }

  // Shuffle
  return pwd.split('').sort(() => 0.5 - Math.random()).join('');
}

async function rotatePasswords() {
  console.log('================================================================================');
  console.log('   E3-EOS CREDENTIAL ROTATION UTILITY (STAGING & PRODUCTION)                    ');
  console.log('================================================================================\n');

  const dbConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'postgres',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
      };

  const pool = new pg.Pool(dbConfig);
  const client = await pool.connect();

  const args = process.argv.slice(2);
  const targetEmailArg = args.find(a => a.startsWith('--email='))?.split('=')[1]?.trim();
  const customPasswordArg = args.find(a => a.startsWith('--password='))?.split('=')[1]?.trim();

  try {
    const query = targetEmailArg
      ? `SELECT id, email, name FROM users WHERE LOWER(email) = LOWER($1);`
      : `SELECT id, email, name FROM users ORDER BY email ASC;`;
    const params = targetEmailArg ? [targetEmailArg] : [];
    const usersRes = await client.query(query, params);

    if (usersRes.rows.length === 0) {
      console.log(targetEmailArg ? `User with email ${targetEmailArg} not found.` : 'No users found in database to rotate.');
      return;
    }

    console.log(`Found ${usersRes.rows.length} user account(s). Rotating credentials...\n`);

    const rotatedCreds = [];

    for (const u of usersRes.rows) {
      const newPassword = customPasswordArg || generateSecurePassword(20);
      const hashedPassword = hashPassword(newPassword);

      await client.query(`
        UPDATE accounts
        SET password = $1
        WHERE user_id = $2 AND provider_id = 'credential';
      `, [hashedPassword, u.id]);

      // If no account existed, create one
      await client.query(`
        INSERT INTO accounts (id, user_id, account_id, provider_id, password, created_at)
        SELECT gen_random_uuid(), $1, $2, 'credential', $3, NOW()
        WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE user_id = $1 AND provider_id = 'credential');
      `, [u.id, u.email, hashedPassword]);

      rotatedCreds.push({
        email: u.email,
        name: u.name,
        password: newPassword,
        rotatedAt: new Date().toISOString(),
      });

      console.log(`✓ Rotated: ${u.email.padEnd(32)} [Password: ${newPassword.slice(0, 4)}••••••••••••${newPassword.slice(-2)}]`);
    }

    // Save rotated credentials securely to local ignored file
    const secureOutPath = path.join(process.cwd(), '.credentials.local.json');
    fs.writeFileSync(secureOutPath, JSON.stringify(rotatedCreds, null, 2), { mode: 0o600 });

    console.log(`\n================================================================================`);
    console.log(`   SUCCESS: Rotated ${rotatedCreds.length} account credentials.`);
    console.log(`   Secure credential file written to: .credentials.local.json`);
    console.log(`   (Note: .credentials.local.json is git-ignored and never committed to source)`);
    console.log(`================================================================================\n`);
  } finally {
    client.release();
    await pool.end();
  }
}

rotatePasswords().catch((err) => {
  console.error('Password rotation failed:', err);
  process.exit(1);
});
