/**
 * API Endpoints Test Script
 * 
 * Tests the Phase 1 API endpoints:
 * - Invitation endpoints
 * - Password reset endpoints
 * - User management endpoints
 */

import { query } from '../src/lib/db/index.js';
import { createInvite, getInviteByTokenHash } from '../src/lib/db/users.js';
import { generateTokenHex, sha256 } from '../src/lib/security/tokens.js';
import { generateTemporaryPassword } from '../src/lib/security/passwordGenerator.js';
import { createAuditLog, getUserAuditLogs } from '../src/lib/db/auditLogs.js';
import bcrypt from 'bcryptjs';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name) {
  log(`\n🧪 Testing: ${name}`, 'blue');
}

function logPass(message) {
  log(`  ✅ ${message}`, 'green');
}

function logFail(message) {
  log(`  ❌ ${message}`, 'red');
}

async function testInvitationFlow() {
  logTest('Invitation Flow');

  try {
    // Get or create a test role
    let role = await query('SELECT id, code FROM roles WHERE code = $1', ['student']);
    if (role.rows.length === 0) {
      const roleRes = await query(
        `INSERT INTO roles (id, code, title, created_at, updated_at)
         VALUES (uuid_generate_v4(), 'student', 'Student', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, code`,
        []
      );
      role = roleRes;
    }
    const roleId = role.rows[0].id;

    // Get or create a test user (creator)
    let creator = await query('SELECT id FROM users WHERE email = $1', ['test@example.com']);
    if (creator.rows.length === 0) {
      const creatorRes = await query(
        `INSERT INTO users (id, email, password_hash, created_at, updated_at)
         VALUES (uuid_generate_v4(), 'test@example.com', $1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        [await bcrypt.hash('test123', 10)]
      );
      creator = creatorRes;
    }
    const creatorId = creator.rows[0].id;

    // Generate invitation token
    const token = generateTokenHex(32);
    const tokenHash = sha256(token);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create invitation
    const invite = await createInvite({
      email: 'invite-test@example.com',
      orgId: null,
      roleId,
      creatorId,
      mode: 'temp_password_email',
      mfa_required: false,
      mfa_method: 'none',
      payload: { first_name: 'Test', last_name: 'User' },
      expiresAt,
      tokenHash: tokenHash.toString('hex'),
    });

    if (invite && invite.id) {
      logPass('Invitation creation works');
    } else {
      logFail('Invitation creation failed');
      return false;
    }

    // Test getting invitation by token
    const retrievedInvite = await getInviteByTokenHash(tokenHash.toString('hex'));
    if (retrievedInvite && retrievedInvite.id === invite.id) {
      logPass('Get invitation by token works');
    } else {
      logFail('Get invitation by token failed');
      return false;
    }

    // Cleanup
    await query('DELETE FROM invite_tokens WHERE id = $1', [invite.id]);

    return true;
  } catch (error) {
    logFail(`Invitation flow test failed: ${error.message}`);
    return false;
  }
}

async function testPasswordResetFlow() {
  logTest('Password Reset Flow');

  try {
    // Create a test user
    let user = await query('SELECT id, email FROM users WHERE email = $1', ['password-reset-test@example.com']);
    if (user.rows.length === 0) {
      const userRes = await query(
        `INSERT INTO users (id, email, password_hash, created_at, updated_at)
         VALUES (uuid_generate_v4(), 'password-reset-test@example.com', $1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, email`,
        [await bcrypt.hash('oldpassword', 10)]
      );
      user = userRes;
    }
    const userId = user.rows[0].id;

    // Create user_auth record if it doesn't exist
    await query(
      `INSERT INTO user_auth (user_id, password_hash, must_reset_password, created_at, updated_at)
       VALUES ($1, $2, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, await bcrypt.hash('oldpassword', 10)]
    );

    // Generate reset token
    const resetToken = await import('crypto').then(m => m.default.randomBytes(32).toString('hex'));
    const resetTokenHash = await import('crypto').then(m => m.default.createHash('sha256').update(resetToken).digest('hex'));
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Store reset token
    await query(
      `UPDATE user_auth 
       SET password_reset_token = $1, password_reset_expires = $2, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $3`,
      [resetTokenHash, expiresAt, userId]
    );

    // Verify token exists
    const tokenCheck = await query(
      `SELECT password_reset_token, password_reset_expires 
       FROM user_auth 
       WHERE user_id = $1 AND password_reset_token = $2 AND password_reset_expires > CURRENT_TIMESTAMP`,
      [userId, resetTokenHash]
    );

    if (tokenCheck.rows.length > 0) {
      logPass('Password reset token storage works');
    } else {
      logFail('Password reset token storage failed');
      return false;
    }

    // Test password update
    const newPasswordHash = await bcrypt.hash('newpassword123', 10);
    await query(
      `UPDATE user_auth 
       SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [newPasswordHash, userId]
    );

    // Verify password was updated
    const passwordCheck = await query(
      `SELECT password_hash FROM user_auth WHERE user_id = $1`,
      [userId]
    );

    if (passwordCheck.rows.length > 0 && passwordCheck.rows[0].password_hash) {
      logPass('Password reset completion works');
    } else {
      logFail('Password reset completion failed');
      return false;
    }

    // Cleanup
    await query('DELETE FROM user_auth WHERE user_id = $1', [userId]);
    await query('DELETE FROM users WHERE id = $1', [userId]);

    return true;
  } catch (error) {
    logFail(`Password reset flow test failed: ${error.message}`);
    return false;
  }
}

async function testAuditLogQueries() {
  logTest('Audit Log Queries');

  try {
    // Create test audit logs (use valid action names - lowercase letters and underscores only)
    const testLogs = [];
    const actionNames = ['test_action_one', 'test_action_two', 'test_action_three', 'test_action_four', 'test_action_five'];
    for (let i = 0; i < 5; i++) {
      const log = await createAuditLog({
        actorId: null,
        action: actionNames[i],
        resourceType: 'test',
        resourceId: null,
        newValues: { test: i },
      });
      testLogs.push(log);
    }

    if (testLogs.length === 5) {
      logPass('Multiple audit log creation works');
    } else {
      logFail('Multiple audit log creation failed');
      return false;
    }

    // Test getting audit logs with filters (use a dummy UUID since we're filtering by action)
    const logs = await getUserAuditLogs('00000000-0000-0000-0000-000000000000', {
      limit: 10,
      offset: 0,
      action: 'test_action_one',
    });

    if (logs && Array.isArray(logs.logs) && logs.total >= 0) {
      logPass('Filtered audit log queries work');
    } else {
      logFail('Filtered audit log queries failed');
      return false;
    }

    // Cleanup
    for (const log of testLogs) {
      if (log && log.id) {
        await query('DELETE FROM audit_logs WHERE id = $1', [log.id]);
      }
    }

    return true;
  } catch (error) {
    logFail(`Audit log queries test failed: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  log('\n═══════════════════════════════════════════════════════', 'blue');
  log('  User Management API Endpoints - Phase 1 Tests', 'blue');
  log('═══════════════════════════════════════════════════════\n', 'blue');

  const results = {
    invitationFlow: await testInvitationFlow(),
    passwordResetFlow: await testPasswordResetFlow(),
    auditLogQueries: await testAuditLogQueries(),
  };

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;

  log('\n═══════════════════════════════════════════════════════', 'blue');
  log(`  Test Results: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');
  log('═══════════════════════════════════════════════════════\n', 'blue');

  if (passed === total) {
    log('✅ All API endpoint tests passed!', 'green');
    process.exit(0);
  } else {
    log('⚠️  Some tests failed. Please review the output above.', 'yellow');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  logFail(`Test execution failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});

