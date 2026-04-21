/**
 * Classes & Subjects Seeder
 * 
 * Creates sample data for Classes & Subjects feature:
 * - Academic sessions
 * - Terms (Year 1, Year 2)
 * - Sections (A, B)
 * - Program nodes (Streams: Science, Commerce, Arts)
 * - Program nodes (Combinations: ECBA, PCMC, etc.)
 * - Sample subjects
 * - Sample cohorts (classes)
 * 
 * This seeder is idempotent - safe to run multiple times.
 * Only creates data for organizations with 'puc' in academic_levels.
 */

import { query, getClient, closePool } from '../index.js';

/**
 * Get superadmin user ID
 */
async function getSuperadminId() {
  try {
    const result = await query(
      'SELECT id FROM users WHERE role = $1 AND org_id IS NULL LIMIT 1',
      ['superadmin']
    );
    return result.rows.length > 0 ? result.rows[0].id : null;
  } catch (error) {
    if (error.code === '42P01') {
      return null;
    }
    throw error;
  }
}

/**
 * Get organizations with PUC level
 */
async function getPucOrganizations() {
  try {
    const result = await query(
      `SELECT id, name, org_code, academic_levels 
       FROM organizations 
       WHERE academic_levels IS NOT NULL 
       AND 'puc' = ANY(academic_levels)
       AND status = 'active'`
    );
    return result.rows;
  } catch (error) {
    if (error.code === '42P01') {
      return [];
    }
    throw error;
  }
}

/**
 * Check if academic session exists
 */
async function sessionExists(orgId, code) {
  try {
    const result = await query(
      'SELECT id FROM academic_sessions WHERE org_id = $1 AND code = $2',
      [orgId, code]
    );
    return result.rows.length > 0 ? result.rows[0].id : null;
  } catch (error) {
    if (error.code === '42P01') {
      return null;
    }
    throw error;
  }
}

/**
 * Check if term exists
 */
async function termExists(orgId, termType, number, label) {
  try {
    const result = await query(
      'SELECT id FROM terms WHERE org_id = $1 AND term_type = $2 AND number = $3 AND label = $4',
      [orgId, termType, number, label]
    );
    return result.rows.length > 0 ? result.rows[0].id : null;
  } catch (error) {
    if (error.code === '42P01') {
      return null;
    }
    throw error;
  }
}

/**
 * Check if section exists
 */
async function sectionExists(orgId, label) {
  try {
    const result = await query(
      'SELECT id FROM sections WHERE org_id = $1 AND label = $2',
      [orgId, label]
    );
    return result.rows.length > 0 ? result.rows[0].id : null;
  } catch (error) {
    if (error.code === '42P01') {
      return null;
    }
    throw error;
  }
}

/**
 * Check if program node exists
 */
async function programNodeExists(orgId, level, nodeType, code) {
  try {
    const result = await query(
      'SELECT id FROM program_nodes WHERE org_id = $1 AND level = $2 AND node_type = $3 AND code = $4',
      [orgId, level, nodeType, code]
    );
    return result.rows.length > 0 ? result.rows[0].id : null;
  } catch (error) {
    if (error.code === '42P01') {
      return null;
    }
    throw error;
  }
}

/**
 * Check if subject exists
 */
async function subjectExists(orgId, code) {
  try {
    const result = await query(
      'SELECT id FROM subject_catalog WHERE org_id = $1 AND code = $2',
      [orgId, code]
    );
    return result.rows.length > 0 ? result.rows[0].id : null;
  } catch (error) {
    if (error.code === '42P01') {
      return null;
    }
    throw error;
  }
}

/**
 * Seed data for a single organization
 */
async function seedOrganizationData(orgId, orgName, superadminId) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    console.log(`\n  📚 Seeding data for: ${orgName} (${orgId.substring(0, 8)}...)`);

    // 1. Create academic session (2025-26)
    const sessionCode = '2025-26';
    let sessionId = await sessionExists(orgId, sessionCode);
    
    if (!sessionId) {
      const sessionResult = await client.query(
        `INSERT INTO academic_sessions (org_id, code, start_date, end_date, is_current)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          orgId,
          sessionCode,
          '2025-06-01', // Start date
          '2026-05-31', // End date
          true, // is_current
        ]
      );
      sessionId = sessionResult.rows[0].id;
      console.log(`    ✅ Created academic session: ${sessionCode}`);
    } else {
      // Update to current if not already
      await client.query(
        'UPDATE academic_sessions SET is_current = true WHERE id = $1',
        [sessionId]
      );
      console.log(`    ℹ️  Academic session exists: ${sessionCode}`);
    }

    // 2. Create terms (Year 1, Year 2)
    const terms = [
      { type: 'year', number: 1, label: 'I PUC' },
      { type: 'year', number: 2, label: 'II PUC' },
    ];

    const termIds = {};
    for (const term of terms) {
      let termId = await termExists(orgId, term.type, term.number, term.label);
      
      if (!termId) {
        const termResult = await client.query(
          `INSERT INTO terms (org_id, term_type, number, label)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [orgId, term.type, term.number, term.label]
        );
        termId = termResult.rows[0].id;
        console.log(`    ✅ Created term: ${term.label}`);
      } else {
        console.log(`    ℹ️  Term exists: ${term.label}`);
      }
      
      termIds[term.label] = termId;
    }

    // 3. Create sections (A, B)
    const sections = ['A', 'B'];
    const sectionIds = {};
    
    for (const sectionLabel of sections) {
      let sectionId = await sectionExists(orgId, sectionLabel);
      
      if (!sectionId) {
        const sectionResult = await client.query(
          `INSERT INTO sections (org_id, label, capacity)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [orgId, sectionLabel, 60] // Default capacity: 60
        );
        sectionId = sectionResult.rows[0].id;
        console.log(`    ✅ Created section: ${sectionLabel}`);
      } else {
        console.log(`    ℹ️  Section exists: ${sectionLabel}`);
      }
      
      sectionIds[sectionLabel] = sectionId;
    }

    // 4. Create program nodes (Streams: Science, Commerce, Arts)
    const streams = [
      { code: 'SCI', title: 'Science' },
      { code: 'COM', title: 'Commerce' },
      { code: 'ART', title: 'Arts' },
    ];

    const streamIds = {};
    for (const stream of streams) {
      let streamId = await programNodeExists(orgId, 'puc', 'stream', stream.code);
      
      if (!streamId) {
        const streamResult = await client.query(
          `INSERT INTO program_nodes (org_id, level, node_type, code, title, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            orgId,
            'puc',
            'stream',
            stream.code,
            stream.title,
            JSON.stringify({ board: 'State', medium: 'English' }),
          ]
        );
        streamId = streamResult.rows[0].id;
        console.log(`    ✅ Created stream: ${stream.title} (${stream.code})`);
      } else {
        console.log(`    ℹ️  Stream exists: ${stream.title}`);
      }
      
      streamIds[stream.code] = streamId;
    }

    // 5. Create program nodes (Combinations)
    const combinations = [
      { code: 'ECBA', title: 'Economics, Commerce, Business Studies, Accountancy', streamCode: 'COM' },
      { code: 'PCMC', title: 'Physics, Mathematics, Chemistry, Computer Science', streamCode: 'SCI' },
      { code: 'PCMB', title: 'Physics, Chemistry, Mathematics, Biology', streamCode: 'SCI' },
      { code: 'HEPS', title: 'History, Economics, Political Science, Sociology', streamCode: 'ART' },
    ];

    const combinationIds = {};
    for (const combo of combinations) {
      const parentId = streamIds[combo.streamCode];
      let comboId = await programNodeExists(orgId, 'puc', 'combination', combo.code);
      
      if (!comboId) {
        const comboResult = await client.query(
          `INSERT INTO program_nodes (org_id, level, node_type, code, title, parent_id, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [
            orgId,
            'puc',
            'combination',
            combo.code,
            combo.title,
            parentId,
            JSON.stringify({ board: 'State' }),
          ]
        );
        comboId = comboResult.rows[0].id;
        console.log(`    ✅ Created combination: ${combo.title} (${combo.code})`);
      } else {
        console.log(`    ℹ️  Combination exists: ${combo.code}`);
      }
      
      combinationIds[combo.code] = comboId;
    }

    // 6. Create sample subjects
    const subjects = [
      // Science subjects
      { code: 'PHY101', title: 'Physics', category: 'core', level: 'puc', credits: 4.0, hours: 5 },
      { code: 'CHE101', title: 'Chemistry', category: 'core', level: 'puc', credits: 4.0, hours: 5 },
      { code: 'MAT101', title: 'Mathematics', category: 'core', level: 'puc', credits: 4.0, hours: 5 },
      { code: 'BIO101', title: 'Biology', category: 'core', level: 'puc', credits: 4.0, hours: 5 },
      { code: 'CS101', title: 'Computer Science', category: 'core', level: 'puc', credits: 3.0, hours: 4 },
      
      // Commerce subjects
      { code: 'ECO101', title: 'Economics', category: 'core', level: 'puc', credits: 4.0, hours: 5 },
      { code: 'ACC101', title: 'Accountancy', category: 'core', level: 'puc', credits: 4.0, hours: 5 },
      { code: 'BS101', title: 'Business Studies', category: 'core', level: 'puc', credits: 3.0, hours: 4 },
      { code: 'STA101', title: 'Statistics', category: 'core', level: 'puc', credits: 3.0, hours: 4 },
      
      // Arts subjects
      { code: 'HIS101', title: 'History', category: 'core', level: 'puc', credits: 4.0, hours: 5 },
      { code: 'POL101', title: 'Political Science', category: 'core', level: 'puc', credits: 4.0, hours: 5 },
      { code: 'SOC101', title: 'Sociology', category: 'core', level: 'puc', credits: 3.0, hours: 4 },
      { code: 'PSY101', title: 'Psychology', category: 'core', level: 'puc', credits: 3.0, hours: 4 },
      
      // Common subjects
      { code: 'ENG101', title: 'English', category: 'mandatory', level: 'puc', credits: 3.0, hours: 4 },
      { code: 'LANG101', title: 'Second Language', category: 'mandatory', level: 'puc', credits: 2.0, hours: 3 },
    ];

    const subjectIds = {};
    for (const subject of subjects) {
      let subjectId = await subjectExists(orgId, subject.code);
      
      if (!subjectId) {
        const subjectResult = await client.query(
          `INSERT INTO subject_catalog (org_id, code, title, category, credits, hours_per_week, level, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id`,
          [
            orgId,
            subject.code,
            subject.title,
            subject.category,
            subject.credits,
            subject.hours,
            subject.level,
            'active',
          ]
        );
        subjectId = subjectResult.rows[0].id;
        console.log(`    ✅ Created subject: ${subject.title} (${subject.code})`);
      } else {
        console.log(`    ℹ️  Subject exists: ${subject.code}`);
      }
      
      subjectIds[subject.code] = subjectId;
    }

    // 7. Create sample cohorts (classes)
    // Example: I-PUC-ECBA-A-2025-27
    const cohorts = [
      { combination: 'ECBA', section: 'A', term: 'I PUC', code: 'I-PUC-ECBA-A-2025-26' },
      { combination: 'ECBA', section: 'B', term: 'I PUC', code: 'I-PUC-ECBA-B-2025-26' },
      { combination: 'PCMC', section: 'A', term: 'I PUC', code: 'I-PUC-PCMC-A-2025-26' },
      { combination: 'PCMC', section: 'B', term: 'I PUC', code: 'I-PUC-PCMC-B-2025-26' },
    ];

    for (const cohort of cohorts) {
      const programNodeId = combinationIds[cohort.combination];
      const sectionId = sectionIds[cohort.section];
      const termId = termIds[cohort.term];

      // Check if cohort exists
      const cohortCheck = await client.query(
        `SELECT id FROM cohorts 
         WHERE org_id = $1 AND program_node_id = $2 AND section_id = $3 AND session_id = $4 AND term_id = $5`,
        [orgId, programNodeId, sectionId, sessionId, termId]
      );

      if (cohortCheck.rows.length === 0) {
        await client.query(
          `INSERT INTO cohorts (
            org_id, level, program_node_id, term_id, section_id, session_id,
            code, status, created_by, created_by_role, locked_fields
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            orgId,
            'puc',
            programNodeId,
            termId,
            sectionId,
            sessionId,
            cohort.code,
            'draft',
            superadminId,
            'superadmin',
            JSON.stringify({ level: true, program_node_id: true }), // Locked fields
          ]
        );
        console.log(`    ✅ Created cohort: ${cohort.code}`);
      } else {
        console.log(`    ℹ️  Cohort exists: ${cohort.code}`);
      }
    }

    await client.query('COMMIT');
    return { success: true, orgId, orgName };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Seed classes and subjects data
 */
export async function seedClassesSubjects() {
  console.log('🌱 Seeding Classes & Subjects data...\n');

  try {
    // Get superadmin user
    const superadminId = await getSuperadminId();
    if (!superadminId) {
      console.log('⚠️  Superadmin user not found. Please run seed-superadmin first.');
      return { success: false, error: 'Superadmin not found' };
    }

    // Get organizations with PUC level
    const orgs = await getPucOrganizations();
    
    if (orgs.length === 0) {
      console.log('ℹ️  No organizations with PUC level found.');
      console.log('   Create an organization with "puc" in academic_levels to seed data.');
      return { success: true, created: false, message: 'No PUC organizations found' };
    }

    console.log(`📋 Found ${orgs.length} organization(s) with PUC level\n`);

    const results = [];
    for (const org of orgs) {
      try {
        const result = await seedOrganizationData(org.id, org.name, superadminId);
        results.push(result);
      } catch (error) {
        console.error(`❌ Failed to seed data for ${org.name}:`, error.message);
        results.push({ success: false, orgId: org.id, orgName: org.name, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 Seeding Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    return {
      success: failCount === 0,
      created: successCount > 0,
      results,
    };

  } catch (error) {
    console.error('❌ Failed to seed classes & subjects data:\n');
    console.error(`Error: ${error.message}`);
    console.error(`Stack: ${error.stack}\n`);
    
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Run seeder (standalone execution)
 */
async function runSeeder() {
  try {
    await seedClassesSubjects();
    console.log('✅ Seeding completed!\n');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSeeder();
}

export default seedClassesSubjects;

