import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

const email = process.argv[2];

if (!email) {
  console.error('❌ Usage: node scripts/reset-mfa-secret.js user@example.com');
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

async function run() {
  try {
    await client.connect();

    console.log(`🔍 Resetting MFA for: ${email}`);

    const result = await client.query(
      `
      UPDATE users
      SET
        mfa_secret = NULL,
        mfa_enabled = FALSE,
        mfa_verified_at = NULL,
        backup_codes = NULL,
        trusted_devices = NULL,
        updated_at = NOW()
      WHERE email = $1
      RETURNING id, email, mfa_enabled
      `,
      [email]
    );

    if (result.rowCount === 0) {
      console.log('⚠️ No user found');
      return;
    }

    console.log('✅ MFA reset successful');
    console.table(result.rows);
    console.log('➡️ User must re-enroll MFA from security settings');
  } catch (error) {
    console.error('❌ MFA reset failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();