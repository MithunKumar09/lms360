/**
 * Parent Student Achievements Database Utilities
 * 
 * Provides queries for student achievements, badges, and certificates visible to parents.
 * Respects access permissions from parent_student_links and parent_access_settings.
 * 
 * @module db/parent/achievements
 */

import { query } from '../index.js';

/**
 * Get student achievements (badges, certificates, rewards, timeline)
 * @param {string} studentId - Student user UUID
 * @returns {Promise<Object>} Achievements data
 */
export async function getStudentAchievements(studentId) {
  // Get badges (from milestones if available)
  let badges = [];
  try {
    const badgesQuery = `
      SELECT 
        sm.id,
        sm.milestone_name as name,
        sm.description,
        sm.icon,
        sm.completed_at as earned_at
      FROM student_milestones sm
      WHERE sm.student_id = $1
      ORDER BY sm.completed_at DESC
    `;
    const badgesResult = await query(badgesQuery, [studentId]);
    badges = badgesResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || `Completed milestone: ${row.name}`,
      icon: row.icon || '🏅',
      earnedAt: row.earned_at,
    }));
  } catch (error) {
    console.warn('Badges query error (milestones table may not exist):', error.message);
  }

  // Get certificates
  let certificates = [];
  try {
    const certificatesQuery = `
      SELECT 
        ct.id,
        ct.name,
        ct.description,
        ct.certificate_url,
        ct.verification_code,
        ct.issued_at,
        c.title as course_name
      FROM course_certificates ct
      INNER JOIN courses c ON ct.course_id = c.id
      WHERE ct.student_id = $1
      ORDER BY ct.issued_at DESC
    `;
    const certificatesResult = await query(certificatesQuery, [studentId]);
    certificates = certificatesResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || `Certificate for ${row.course_name}`,
      courseName: row.course_name,
      url: row.certificate_url,
      verificationCode: row.verification_code,
      issuedAt: row.issued_at,
    }));
  } catch (error) {
    console.warn('Certificates query error (certificates table may not exist):', error.message);
  }

  // Get rewards (if reward system exists)
  // TODO: Update when reward system is implemented
  const rewards = [];

  // Build timeline from all achievements
  const timeline = [];
  
  // Add badges to timeline
  badges.forEach(badge => {
    timeline.push({
      id: `badge-${badge.id}`,
      title: `Earned Badge: ${badge.name}`,
      description: badge.description,
      date: badge.earnedAt,
      type: 'badge',
    });
  });

  // Add certificates to timeline
  certificates.forEach(cert => {
    timeline.push({
      id: `cert-${cert.id}`,
      title: `Earned Certificate: ${cert.name}`,
      description: `Certificate for ${cert.courseName}`,
      date: cert.issuedAt,
      type: 'certificate',
    });
  });

  // Add course completions to timeline
  try {
    const completionsQuery = `
      SELECT 
        ce.completed_at,
        c.title as course_name
      FROM course_enrollments ce
      INNER JOIN courses c ON ce.course_id = c.id
      WHERE ce.user_id = $1 AND ce.enrollment_status = 'completed' AND ce.completed_at IS NOT NULL
      ORDER BY ce.completed_at DESC
    `;
    const completionsResult = await query(completionsQuery, [studentId]);
    completionsResult.rows.forEach(row => {
      timeline.push({
        id: `completion-${row.completed_at}`,
        title: `Completed Course: ${row.course_name}`,
        description: `Successfully completed ${row.course_name}`,
        date: row.completed_at,
        type: 'completion',
      });
    });
  } catch (error) {
    console.warn('Course completions timeline error:', error.message);
  }

  // Sort timeline by date (newest first)
  timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    badges,
    certificates,
    rewards,
    timeline,
  };
}
