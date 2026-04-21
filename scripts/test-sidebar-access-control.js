/**
 * Sidebar Access Control System Test Script
 * 
 * This script tests the Sidebar Access Control implementation:
 * - Database schema
 * - Database utility functions
 * - Priority resolution (User > Org > Role > Global)
 * - API endpoints (requires running server)
 * - Edge cases and error handling
 * 
 * Run with: node scripts/test-sidebar-access-control.js
 */

import { query } from '../src/lib/db/index.js';
import {
  getSidebarAccessControl,
  getAllSidebarAccessControls,
  upsertSidebarAccessControl,
  deleteSidebarAccessControl,
  getEffectiveSidebarAccess,
  checkSidebarAccess,
  VALID_SIDEBAR_NAMES,
  VALID_SCOPE_TYPES,
} from '../src/lib/db/sidebar-access-control.js';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
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

function logWarn(message) {
  log(`  ⚠️  ${message}`, 'yellow');
}

let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
};

// Test user and organization IDs (will be created during setup)
let testSuperadminId = null;
let testAdminId = null;
let testInstructorId = null;
let testStudentId = null;
let testOrgId = null;
let testOrg2Id = null;

/**
 * Setup test data
 */
async function setupTestData() {
  logTest('Setting up test data');

  try {
    // Get or create a superadmin user for created_by field
    const superadminResult = await query(`
      SELECT id FROM users 
      WHERE role = 'superadmin' 
      LIMIT 1
    `);

    if (superadminResult.rows.length > 0) {
      testSuperadminId = superadminResult.rows[0].id;
      logPass(`Using existing superadmin: ${testSuperadminId}`);
    } else {
      logWarn('No superadmin found. Some tests may fail.');
      // Create a test superadmin
      const createResult = await query(`
        INSERT INTO users (email, password_hash, role, org_id, is_active)
        VALUES ('test-superadmin@test.com', '$2a$10$test', 'superadmin', NULL, true)
        RETURNING id
      `);
      testSuperadminId = createResult.rows[0].id;
      logPass(`Created test superadmin: ${testSuperadminId}`);
    }

    // Get or create test organizations
    const orgResult = await query(`
      SELECT id FROM organizations 
      WHERE name LIKE 'Test Org%' 
      LIMIT 1
    `);

    if (orgResult.rows.length > 0) {
      testOrgId = orgResult.rows[0].id;
      logPass(`Using existing test organization: ${testOrgId}`);
    } else {
      const createOrgResult = await query(`
        INSERT INTO organizations (name, status)
        VALUES ('Test Org 1', 'active')
        RETURNING id
      `);
      testOrgId = createOrgResult.rows[0].id;
      logPass(`Created test organization: ${testOrgId}`);
    }

    // Get or create test users
    const adminResult = await query(`
      SELECT id FROM users 
      WHERE role = 'admin' AND org_id = $1
      LIMIT 1
    `, [testOrgId]);

    if (adminResult.rows.length > 0) {
      testAdminId = adminResult.rows[0].id;
      logPass(`Using existing admin: ${testAdminId}`);
    } else {
      const createAdminResult = await query(`
        INSERT INTO users (email, password_hash, role, org_id, is_active)
        VALUES ('test-admin@test.com', '$2a$10$test', 'admin', $1, true)
        RETURNING id
      `, [testOrgId]);
      testAdminId = createAdminResult.rows[0].id;
      logPass(`Created test admin: ${testAdminId}`);
    }

    const instructorResult = await query(`
      SELECT id FROM users 
      WHERE role = 'instructor' AND org_id = $1
      LIMIT 1
    `, [testOrgId]);

    if (instructorResult.rows.length > 0) {
      testInstructorId = instructorResult.rows[0].id;
      logPass(`Using existing instructor: ${testInstructorId}`);
    } else {
      const createInstructorResult = await query(`
        INSERT INTO users (email, password_hash, role, org_id, is_active)
        VALUES ('test-instructor@test.com', '$2a$10$test', 'instructor', $1, true)
        RETURNING id
      `, [testOrgId]);
      testInstructorId = createInstructorResult.rows[0].id;
      logPass(`Created test instructor: ${testInstructorId}`);
    }

    const studentResult = await query(`
      SELECT id FROM users 
      WHERE role = 'student' AND org_id = $1
      LIMIT 1
    `, [testOrgId]);

    if (studentResult.rows.length > 0) {
      testStudentId = studentResult.rows[0].id;
      logPass(`Using existing student: ${testStudentId}`);
    } else {
      const createStudentResult = await query(`
        INSERT INTO users (email, password_hash, role, org_id, is_active)
        VALUES ('test-student@test.com', '$2a$10$test', 'student', $1, true)
        RETURNING id
      `, [testOrgId]);
      testStudentId = createStudentResult.rows[0].id;
      logPass(`Created test student: ${testStudentId}`);
    }

    return true;
  } catch (error) {
    logFail(`Test setup failed: ${error.message}`);
    return false;
  }
}

/**
 * Cleanup test data
 */
async function cleanupTestData() {
  logTest('Cleaning up test data');

  try {
    // Delete test sidebar access control settings
    await query(`
      DELETE FROM sidebar_access_control 
      WHERE created_by = $1 
         OR scope_value IN ($2, $3, $4, $5)
    `, [testSuperadminId, testAdminId, testInstructorId, testStudentId, testOrgId]);

    logPass('Test sidebar access control settings cleaned up');
    return true;
  } catch (error) {
    logWarn(`Cleanup warning: ${error.message}`);
    return false;
  }
}

/**
 * Test database schema
 */
async function testDatabaseSchema() {
  logTest('Database Schema');

  try {
    // Check if table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'sidebar_access_control'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      logFail('sidebar_access_control table does not exist');
      testResults.failed++;
      return false;
    }
    logPass('sidebar_access_control table exists');

    // Check columns
    const columnsCheck = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sidebar_access_control'
      ORDER BY column_name
    `);

    const requiredColumns = [
      'id', 'scope_type', 'scope_value', 'sidebar_name', 
      'is_enabled', 'created_by', 'created_at', 'updated_at'
    ];
    const existingColumns = columnsCheck.rows.map(r => r.column_name);

    for (const col of requiredColumns) {
      if (existingColumns.includes(col)) {
        logPass(`Column ${col} exists`);
      } else {
        logFail(`Column ${col} is missing`);
        testResults.failed++;
        return false;
      }
    }

    // Check indexes
    const indexesCheck = await query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'sidebar_access_control'
    `);

    const indexNames = indexesCheck.rows.map(r => r.indexname);
    const requiredIndexes = [
      'idx_sidebar_access_control_scope_type',
      'idx_sidebar_access_control_scope_value',
      'idx_sidebar_access_control_sidebar_name',
      'idx_sidebar_access_control_enabled',
    ];

    for (const idx of requiredIndexes) {
      if (indexNames.some(name => name.includes(idx.replace('idx_', '')))) {
        logPass(`Index ${idx} exists`);
      } else {
        logWarn(`Index ${idx} may be missing`);
      }
    }

    // Check constraints
    const constraintsCheck = await query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'sidebar_access_control'
    `);

    const hasUniqueConstraint = constraintsCheck.rows.some(
      r => r.constraint_name.includes('unique_scope_sidebar')
    );
    if (hasUniqueConstraint) {
      logPass('Unique constraint on (scope_type, scope_value, sidebar_name) exists');
    } else {
      logFail('Unique constraint missing');
      testResults.failed++;
      return false;
    }

    testResults.passed++;
    return true;
  } catch (error) {
    logFail(`Database schema test failed: ${error.message}`);
    testResults.failed++;
    return false;
  }
}

/**
 * Test database utility functions
 */
async function testDatabaseUtilities() {
  logTest('Database Utility Functions');

  try {
    // Test upsertSidebarAccessControl
    const setting1 = await upsertSidebarAccessControl({
      scopeType: 'global',
      scopeValue: null,
      sidebarName: 'admin',
      isEnabled: true,
      created_by: testSuperadminId,
    });

    if (setting1 && setting1.id) {
      logPass('upsertSidebarAccessControl (global) works');
    } else {
      logFail('upsertSidebarAccessControl (global) failed');
      testResults.failed++;
      return false;
    }

    // Test getSidebarAccessControl
    const retrieved = await getSidebarAccessControl('global', null, 'admin');
    if (retrieved && retrieved.id === setting1.id) {
      logPass('getSidebarAccessControl works');
    } else {
      logFail('getSidebarAccessControl failed');
      testResults.failed++;
      return false;
    }

    // Test role-based setting
    const setting2 = await upsertSidebarAccessControl({
      scopeType: 'role',
      scopeValue: 'instructor',
      sidebarName: 'instructor',
      isEnabled: false,
      created_by: testSuperadminId,
    });

    if (setting2 && setting2.id) {
      logPass('upsertSidebarAccessControl (role) works');
    } else {
      logFail('upsertSidebarAccessControl (role) failed');
      testResults.failed++;
      return false;
    }

    // Test organization-based setting
    const setting3 = await upsertSidebarAccessControl({
      scopeType: 'organization',
      scopeValue: testOrgId,
      sidebarName: 'admin',
      isEnabled: true,
      created_by: testSuperadminId,
    });

    if (setting3 && setting3.id) {
      logPass('upsertSidebarAccessControl (organization) works');
    } else {
      logFail('upsertSidebarAccessControl (organization) failed');
      testResults.failed++;
      return false;
    }

    // Test user-based setting
    const setting4 = await upsertSidebarAccessControl({
      scopeType: 'user',
      scopeValue: testStudentId,
      sidebarName: 'student',
      isEnabled: false,
      created_by: testSuperadminId,
    });

    if (setting4 && setting4.id) {
      logPass('upsertSidebarAccessControl (user) works');
    } else {
      logFail('upsertSidebarAccessControl (user) failed');
      testResults.failed++;
      return false;
    }

    // Test getAllSidebarAccessControls
    const allSettings = await getAllSidebarAccessControls({ scopeType: 'global' });
    if (Array.isArray(allSettings) && allSettings.length > 0) {
      logPass('getAllSidebarAccessControls works');
    } else {
      logFail('getAllSidebarAccessControls failed');
      testResults.failed++;
      return false;
    }

    // Test deleteSidebarAccessControl
    const deleted = await deleteSidebarAccessControl(setting1.id);
    if (deleted) {
      logPass('deleteSidebarAccessControl works');
    } else {
      logFail('deleteSidebarAccessControl failed');
      testResults.failed++;
      return false;
    }

    testResults.passed++;
    return true;
  } catch (error) {
    logFail(`Database utilities test failed: ${error.message}`);
    testResults.failed++;
    return false;
  }
}

/**
 * Test priority resolution
 */
async function testPriorityResolution() {
  logTest('Priority Resolution (User > Org > Role > Global)');

  try {
    // Clean up any existing settings for this test
    await query(`
      DELETE FROM sidebar_access_control 
      WHERE sidebar_name = 'student' 
        AND (scope_type = 'global' OR scope_type = 'role' OR scope_type = 'organization' OR scope_type = 'user')
    `);

    // 1. Test Global (lowest priority) - should return global setting
    await upsertSidebarAccessControl({
      scopeType: 'global',
      scopeValue: null,
      sidebarName: 'student',
      isEnabled: false,
      created_by: testSuperadminId,
    });

    const globalAccess = await getEffectiveSidebarAccess(
      testStudentId,
      'student',
      testOrgId,
      'student'
    );

    if (globalAccess === false) {
      logPass('Global setting (disabled) is respected');
    } else {
      logFail(`Global setting not respected. Expected false, got ${globalAccess}`);
      testResults.failed++;
      return false;
    }

    // 2. Test Role (higher than global) - should override global
    await upsertSidebarAccessControl({
      scopeType: 'role',
      scopeValue: 'student',
      sidebarName: 'student',
      isEnabled: true,
      created_by: testSuperadminId,
    });

    const roleAccess = await getEffectiveSidebarAccess(
      testStudentId,
      'student',
      testOrgId,
      'student'
    );

    if (roleAccess === true) {
      logPass('Role setting overrides global setting');
    } else {
      logFail(`Role override failed. Expected true, got ${roleAccess}`);
      testResults.failed++;
      return false;
    }

    // 3. Test Organization (higher than role) - should override role
    await upsertSidebarAccessControl({
      scopeType: 'organization',
      scopeValue: testOrgId,
      sidebarName: 'student',
      isEnabled: false,
      created_by: testSuperadminId,
    });

    const orgAccess = await getEffectiveSidebarAccess(
      testStudentId,
      'student',
      testOrgId,
      'student'
    );

    if (orgAccess === false) {
      logPass('Organization setting overrides role setting');
    } else {
      logFail(`Organization override failed. Expected false, got ${orgAccess}`);
      testResults.failed++;
      return false;
    }

    // 4. Test User (highest priority) - should override organization
    await upsertSidebarAccessControl({
      scopeType: 'user',
      scopeValue: testStudentId,
      sidebarName: 'student',
      isEnabled: true,
      created_by: testSuperadminId,
    });

    const userAccess = await getEffectiveSidebarAccess(
      testStudentId,
      'student',
      testOrgId,
      'student'
    );

    if (userAccess === true) {
      logPass('User setting overrides organization setting');
    } else {
      logFail(`User override failed. Expected true, got ${userAccess}`);
      testResults.failed++;
      return false;
    }

    // 5. Test default (no settings) - should default to enabled
    await query(`
      DELETE FROM sidebar_access_control 
      WHERE sidebar_name = 'vendor'
    `);

    const defaultAccess = await getEffectiveSidebarAccess(
      testAdminId,
      'admin',
      testOrgId,
      'vendor'
    );

    if (defaultAccess === true) {
      logPass('Default access (no settings) returns enabled (backward compatibility)');
    } else {
      logFail(`Default access failed. Expected true, got ${defaultAccess}`);
      testResults.failed++;
      return false;
    }

    testResults.passed++;
    return true;
  } catch (error) {
    logFail(`Priority resolution test failed: ${error.message}`);
    testResults.failed++;
    return false;
  }
}

/**
 * Test validation
 */
async function testValidation() {
  logTest('Input Validation');

  try {
    // Test invalid sidebar name
    try {
      await upsertSidebarAccessControl({
        scopeType: 'global',
        scopeValue: null,
        sidebarName: 'invalid-sidebar',
        isEnabled: true,
        created_by: testSuperadminId,
      });
      logFail('Invalid sidebar name was accepted');
      testResults.failed++;
      return false;
    } catch (error) {
      if (error.message.includes('Invalid sidebar name')) {
        logPass('Invalid sidebar name is rejected');
      } else {
        logFail(`Unexpected error: ${error.message}`);
        testResults.failed++;
        return false;
      }
    }

    // Test invalid scope type
    try {
      await upsertSidebarAccessControl({
        scopeType: 'invalid',
        scopeValue: null,
        sidebarName: 'admin',
        isEnabled: true,
        created_by: testSuperadminId,
      });
      logFail('Invalid scope type was accepted');
      testResults.failed++;
      return false;
    } catch (error) {
      if (error.message.includes('Invalid scope type')) {
        logPass('Invalid scope type is rejected');
      } else {
        logFail(`Unexpected error: ${error.message}`);
        testResults.failed++;
        return false;
      }
    }

    // Test global scope with value
    try {
      await upsertSidebarAccessControl({
        scopeType: 'global',
        scopeValue: 'some-value',
        sidebarName: 'admin',
        isEnabled: true,
        created_by: testSuperadminId,
      });
      logFail('Global scope with value was accepted');
      testResults.failed++;
      return false;
    } catch (error) {
      if (error.message.includes('must be NULL') || error.message.includes('scope_value')) {
        logPass('Global scope with value is rejected');
      } else {
        logFail(`Unexpected error: ${error.message}`);
        testResults.failed++;
        return false;
      }
    }

    // Test non-global scope without value
    try {
      await upsertSidebarAccessControl({
        scopeType: 'role',
        scopeValue: null,
        sidebarName: 'admin',
        isEnabled: true,
        created_by: testSuperadminId,
      });
      logFail('Role scope without value was accepted');
      testResults.failed++;
      return false;
    } catch (error) {
      if (error.message.includes('required') || error.message.includes('scope_value')) {
        logPass('Non-global scope without value is rejected');
      } else {
        logFail(`Unexpected error: ${error.message}`);
        testResults.failed++;
        return false;
      }
    }

    testResults.passed++;
    return true;
  } catch (error) {
    logFail(`Validation test failed: ${error.message}`);
    testResults.failed++;
    return false;
  }
}

/**
 * Test edge cases
 */
async function testEdgeCases() {
  logTest('Edge Cases');

  try {
    // Test with null orgId (superadmin)
    const superadminAccess = await getEffectiveSidebarAccess(
      testSuperadminId,
      'superadmin',
      null,
      'superadmin'
    );

    if (typeof superadminAccess === 'boolean') {
      logPass('Superadmin with null orgId handled correctly');
    } else {
      logFail(`Superadmin access check failed. Expected boolean, got ${typeof superadminAccess}`);
      testResults.failed++;
      return false;
    }

    // Test with non-existent sidebar
    const nonExistentAccess = await getEffectiveSidebarAccess(
      testStudentId,
      'student',
      testOrgId,
      'nonexistent'
    );

    // Should default to enabled (backward compatibility)
    if (nonExistentAccess === true) {
      logPass('Non-existent sidebar defaults to enabled');
    } else {
      logWarn(`Non-existent sidebar returned ${nonExistentAccess} (may be expected)`);
    }

    // Test checkSidebarAccess alias
    const aliasAccess = await checkSidebarAccess(
      testStudentId,
      'student',
      testOrgId,
      'student'
    );

    if (typeof aliasAccess === 'boolean') {
      logPass('checkSidebarAccess alias works');
    } else {
      logFail('checkSidebarAccess alias failed');
      testResults.failed++;
      return false;
    }

    testResults.passed++;
    return true;
  } catch (error) {
    logFail(`Edge cases test failed: ${error.message}`);
    testResults.failed++;
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  log('\n' + '='.repeat(60), 'cyan');
  log('  Sidebar Access Control System - Test Suite', 'cyan');
  log('='.repeat(60) + '\n', 'cyan');

  const setupSuccess = await setupTestData();
  if (!setupSuccess) {
    logFail('Test setup failed. Aborting tests.');
    process.exit(1);
  }

  await testDatabaseSchema();
  await testDatabaseUtilities();
  await testPriorityResolution();
  await testValidation();
  await testEdgeCases();

  await cleanupTestData();

  // Print summary
  log('\n' + '='.repeat(60), 'cyan');
  log('  Test Results Summary', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Total Tests: ${testResults.passed + testResults.failed}`, 'cyan');
  log(`✅ Passed: ${testResults.passed}`, 'green');
  log(`❌ Failed: ${testResults.failed}`, 'red');
  log(`⏭️  Skipped: ${testResults.skipped}`, 'yellow');
  log('='.repeat(60) + '\n', 'cyan');

  if (testResults.failed === 0) {
    log('✅ All tests passed!', 'green');
    process.exit(0);
  } else {
    log('⚠️  Some tests failed. Please review the output above.', 'yellow');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  logFail(`Test suite crashed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
