/**
 * Roadmap Milestones Service
 * 
 * Handles milestone calculation, completion checking, and stamp awarding
 * for the student roadmap feature.
 * 
 * @module services/roadmapMilestones
 */

import { query } from '@/lib/db/index.js';
import { calculateStudentCourseProgress } from '@/lib/services/courseProgress.js';
import { 
  getCourseTotalDuration,
  getStudentWatchedDuration,
  getStudentAssignmentScores,
  getStudentQuizScores,
  isStudentEnrolled
} from '@/lib/db/courses/progress.js';

/**
 * Get course structure (modules, quizzes, assignments)
 * @param {string} courseId - Course UUID
 * @returns {Promise<Object>} Course structure with modules, quizzes, assignments
 */
async function getCourseStructure(courseId) {
  try {
    // Fetch modules with order
    const modulesQuery = `
      SELECT 
        cm.id,
        cm.title,
        cm.description,
        cm.order_index
      FROM course_modules cm
      WHERE cm.course_id = $1
      ORDER BY cm.order_index
    `;
    const modulesResult = await query(modulesQuery, [courseId]);
    const modules = modulesResult.rows;

    // Fetch quizzes for this course
    const quizzesQuery = `
      SELECT 
        q.id,
        q.title,
        q.status
      FROM quizzes q
      WHERE q.course_id = $1 AND q.status = 'published'
      ORDER BY q.created_at
    `;
    const quizzesResult = await query(quizzesQuery, [courseId]);
    const quizzes = quizzesResult.rows;

    // Fetch assignments for this course
    const assignmentsQuery = `
      SELECT 
        a.id,
        a.title,
        a.status
      FROM assignments a
      WHERE a.course_id = $1 AND a.status = 'published'
      ORDER BY a.created_at
    `;
    const assignmentsResult = await query(assignmentsQuery, [courseId]);
    const assignments = assignmentsResult.rows;

    return {
      modules,
      quizzes,
      assignments,
    };
  } catch (error) {
    console.error('Error getting course structure:', error);
    throw error;
  }
}

/**
 * Determine milestone strategy based on course structure
 * @param {Object} courseStructure - Course structure object
 * @returns {Object} Milestone strategy with milestones array
 */
function determineMilestoneStrategy(courseStructure) {
  const { modules, quizzes, assignments } = courseStructure;
  const milestones = [];

  const moduleCount = modules.length;
  const quizCount = quizzes.length;
  const assignmentCount = assignments.length;

  // Strategy: Use modules as primary milestones, add quizzes/assignments if available
  if (moduleCount >= 4) {
    // Use first 4 modules as milestones
    for (let i = 0; i < Math.min(4, moduleCount); i++) {
      milestones.push({
        type: 'module',
        referenceId: modules[i].id,
        title: modules[i].title,
      });
    }
  } else if (moduleCount === 3) {
    // Use 3 modules + 1 progress milestone
    for (let i = 0; i < 3; i++) {
      milestones.push({
        type: 'module',
        referenceId: modules[i].id,
        title: modules[i].title,
      });
    }
    milestones.push({
      type: 'completion',
      referenceId: null,
      title: 'Course Completion',
    });
  } else if (moduleCount === 2) {
    // Use 2 modules + 2 progress milestones
    for (let i = 0; i < 2; i++) {
      milestones.push({
        type: 'module',
        referenceId: modules[i].id,
        title: modules[i].title,
      });
    }
    milestones.push({
      type: 'progress',
      referenceId: null,
      title: '50% Progress',
      threshold: 50,
    });
    milestones.push({
      type: 'completion',
      referenceId: null,
      title: 'Course Completion',
    });
  } else if (moduleCount === 1) {
    // Use 1 module + 3 progress milestones
    milestones.push({
      type: 'module',
      referenceId: modules[0].id,
      title: modules[0].title,
    });
    milestones.push({
      type: 'progress',
      referenceId: null,
      title: '25% Progress',
      threshold: 25,
    });
    milestones.push({
      type: 'progress',
      referenceId: null,
      title: '50% Progress',
      threshold: 50,
    });
    milestones.push({
      type: 'completion',
      referenceId: null,
      title: 'Course Completion',
    });
  } else {
    // No modules: Use 4 progress milestones
    milestones.push({
      type: 'progress',
      referenceId: null,
      title: '25% Progress',
      threshold: 25,
    });
    milestones.push({
      type: 'progress',
      referenceId: null,
      title: '50% Progress',
      threshold: 50,
    });
    milestones.push({
      type: 'progress',
      referenceId: null,
      title: '75% Progress',
      threshold: 75,
    });
    milestones.push({
      type: 'completion',
      referenceId: null,
      title: 'Course Completion',
    });
  }

  return { milestones };
}

/**
 * Get or create milestone record
 * @param {string} studentId - Student UUID
 * @param {string} courseId - Course UUID
 * @param {number} milestoneNumber - Milestone number
 * @param {string} milestoneType - Milestone type
 * @param {string|null} referenceId - Reference ID (module/quiz/assignment)
 * @returns {Promise<Object>} Milestone record
 */
async function getOrCreateMilestone(studentId, courseId, milestoneNumber, milestoneType, referenceId) {
  try {
    // Check if milestone exists
    const checkQuery = `
      SELECT * FROM student_course_milestones
      WHERE student_id = $1 AND course_id = $2 AND milestone_number = $3
    `;
    const checkResult = await query(checkQuery, [studentId, courseId, milestoneNumber]);

    if (checkResult.rows.length > 0) {
      // Update reference if needed (in case course structure changed)
      if (checkResult.rows[0].milestone_type !== milestoneType || 
          checkResult.rows[0].milestone_reference_id !== referenceId) {
        const updateQuery = `
          UPDATE student_course_milestones
          SET milestone_type = $4,
              milestone_reference_id = $5,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $6
          RETURNING *
        `;
        const updateResult = await query(updateQuery, [
          milestoneType,
          referenceId,
          checkResult.rows[0].id
        ]);
        return updateResult.rows[0];
      }
      return checkResult.rows[0];
    }

    // Create new milestone
    const insertQuery = `
      INSERT INTO student_course_milestones (
        student_id, course_id, milestone_number, milestone_type, milestone_reference_id
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const insertResult = await query(insertQuery, [
      studentId,
      courseId,
      milestoneNumber,
      milestoneType,
      referenceId
    ]);
    return insertResult.rows[0];
  } catch (error) {
    console.error('Error getting or creating milestone:', error);
    throw error;
  }
}

/**
 * Mark milestone as completed
 * @param {string} studentId - Student UUID
 * @param {string} courseId - Course UUID
 * @param {number} milestoneNumber - Milestone number
 * @returns {Promise<Object>} Updated milestone record
 */
async function markMilestoneCompleted(studentId, courseId, milestoneNumber) {
  try {
    const updateQuery = `
      UPDATE student_course_milestones
      SET completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE student_id = $1 AND course_id = $2 AND milestone_number = $3
        AND completed_at IS NULL
      RETURNING *
    `;
    const result = await query(updateQuery, [studentId, courseId, milestoneNumber]);
    return result.rows[0];
  } catch (error) {
    console.error('Error marking milestone as completed:', error);
    throw error;
  }
}

/**
 * Get total milestones count for course
 * @param {string} courseId - Course UUID
 * @param {string} studentId - Student UUID
 * @returns {Promise<number>} Total milestones count
 */
async function getTotalMilestonesForCourse(courseId, studentId) {
  try {
    const result = await query(
      `SELECT COUNT(*) as count
       FROM student_course_milestones
       WHERE student_id = $1 AND course_id = $2`,
      [studentId, courseId]
    );
    return parseInt(result.rows[0]?.count || 0, 10);
  } catch (error) {
    console.error('Error getting total milestones:', error);
    throw error;
  }
}

/**
 * Check if module is completed
 * @param {string} studentId - Student UUID
 * @param {string} moduleId - Module UUID
 * @returns {Promise<boolean>} True if module is completed
 */
async function isModuleCompleted(studentId, moduleId) {
  try {
    // Get all lessons in this module
    const lessonsQuery = `
      SELECT 
        cl.id,
        cl.duration
      FROM course_lessons cl
      JOIN course_chapters cc ON cl.chapter_id = cc.id
      WHERE cc.module_id = $1
    `;
    const lessonsResult = await query(lessonsQuery, [moduleId]);
    const lessons = lessonsResult.rows;

    if (lessons.length === 0) {
      return false; // No lessons, cannot be completed
    }

    // Check if all lessons are 90%+ watched
    const lessonIds = lessons.map(l => l.id);
    if (lessonIds.length === 0) return false;

    const progressQuery = `
      SELECT 
        COUNT(*) as total_lessons,
        COUNT(CASE WHEN lwp.completed = true OR (lwp.watch_duration::float / NULLIF(lwp.total_duration, 0)) >= 0.9 THEN 1 END) as completed_lessons
      FROM course_lessons cl
      LEFT JOIN lesson_watch_progress lwp ON cl.id = lwp.lesson_id AND lwp.user_id = $1
      WHERE cl.id = ANY($2::uuid[])
    `;
    const progressResult = await query(progressQuery, [studentId, lessonIds]);
    const row = progressResult.rows[0];

    const totalLessons = parseInt(row?.total_lessons || 0, 10);
    const completedLessons = parseInt(row?.completed_lessons || 0, 10);

    return totalLessons > 0 && completedLessons === totalLessons;
  } catch (error) {
    console.error('Error checking module completion:', error);
    return false;
  }
}

/**
 * Check if quiz is passed
 * @param {string} studentId - Student UUID
 * @param {string} quizId - Quiz UUID
 * @returns {Promise<boolean>} True if quiz is passed
 */
async function isQuizPassed(studentId, quizId) {
  try {
    const result = await query(
      `SELECT 1 FROM quiz_attempts
       WHERE quiz_id = $1 AND student_id = $2 AND is_passed = true
       LIMIT 1`,
      [quizId, studentId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking quiz passed:', error);
    return false;
  }
}

/**
 * Check if assignment is submitted
 * @param {string} studentId - Student UUID
 * @param {string} assignmentId - Assignment UUID
 * @returns {Promise<boolean>} True if assignment is submitted
 */
async function isAssignmentSubmitted(studentId, assignmentId) {
  try {
    const result = await query(
      `SELECT 1 FROM assignment_submissions
       WHERE assignment_id = $1 AND student_id = $2
       LIMIT 1`,
      [assignmentId, studentId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking assignment submission:', error);
    return false;
  }
}

/**
 * Get progress threshold for milestone number
 * @param {number} milestoneNumber - Milestone number
 * @returns {number} Progress threshold percentage
 */
function getProgressThreshold(milestoneNumber) {
  const thresholds = [0, 25, 50, 75, 100];
  return thresholds[milestoneNumber] || 0;
}

/**
 * Determine stamp type based on milestone number and total milestones
 * @param {number} milestoneNumber - Milestone number
 * @param {number} totalMilestones - Total milestones for course
 * @returns {string} Stamp type
 */
function determineStampType(milestoneNumber, totalMilestones) {
  if (totalMilestones === 4) {
    if (milestoneNumber === 1 || milestoneNumber === 2) return 'finishing';
    if (milestoneNumber === 3) return 'trophy_blue';
    if (milestoneNumber === 4) return 'trophy_gold';
  } else if (totalMilestones === 3) {
    if (milestoneNumber === 1) return 'finishing';
    if (milestoneNumber === 2) return 'trophy_blue';
    if (milestoneNumber === 3) return 'trophy_gold';
  } else if (totalMilestones === 2) {
    if (milestoneNumber === 1) return 'trophy_blue';
    if (milestoneNumber === 2) return 'trophy_gold';
  } else {
    // Default: finishing for first, trophy_gold for last
    if (milestoneNumber === 1) return 'finishing';
    if (milestoneNumber === totalMilestones) return 'trophy_gold';
    return 'trophy_blue';
  }
  return 'finishing'; // Fallback
}

/**
 * Calculate and initialize milestones for a student in a course
 * @param {string} courseId - Course UUID
 * @param {string} studentId - Student UUID
 * @returns {Promise<Object>} Object with milestones array and metadata
 */
export async function calculateCourseMilestones(courseId, studentId) {
  try {
    // Verify enrollment
    const enrolled = await isStudentEnrolled(studentId, courseId);
    if (!enrolled) {
      throw new Error('Student is not enrolled in this course');
    }

    // Get course structure
    const courseStructure = await getCourseStructure(courseId);
    
    // Determine milestone strategy
    const strategy = determineMilestoneStrategy(courseStructure);
    
    // Create/update milestone records
    const milestones = [];
    for (let i = 0; i < strategy.milestones.length; i++) {
      const milestoneDef = strategy.milestones[i];
      const milestoneNumber = i + 1;
      
      const milestone = await getOrCreateMilestone(
        studentId,
        courseId,
        milestoneNumber,
        milestoneDef.type,
        milestoneDef.referenceId || null
      );
      
      milestones.push(milestone);
    }
    
    return {
      courseId,
      studentId,
      totalMilestones: milestones.length,
      milestones: milestones.map(m => ({
        number: m.milestone_number,
        type: m.milestone_type,
        referenceId: m.milestone_reference_id,
        completed: m.completed_at !== null,
        completedAt: m.completed_at,
        stampAwarded: m.stamp_awarded
      }))
    };
  } catch (error) {
    console.error('Error calculating course milestones:', error);
    throw error;
  }
}

/**
 * Check if milestone is completed
 * @param {string} studentId - Student UUID
 * @param {string} courseId - Course UUID
 * @param {number} milestoneNumber - Milestone number (1, 2, 3, 4...)
 * @returns {Promise<boolean>} True if milestone is completed
 */
export async function checkMilestoneCompletion(studentId, courseId, milestoneNumber) {
  try {
    // Get milestone record
    const milestoneResult = await query(
      `SELECT * FROM student_course_milestones
       WHERE student_id = $1 AND course_id = $2 AND milestone_number = $3`,
      [studentId, courseId, milestoneNumber]
    );
    
    if (milestoneResult.rows.length === 0) {
      return false; // Milestone doesn't exist
    }
    
    const milestone = milestoneResult.rows[0];
    
    // If already marked as completed, return true
    if (milestone.completed_at) {
      return true;
    }
    
    // Check completion based on type
    let isCompleted = false;
    
    switch (milestone.milestone_type) {
      case 'module':
        isCompleted = await isModuleCompleted(studentId, milestone.milestone_reference_id);
        break;
      case 'quiz':
        isCompleted = await isQuizPassed(studentId, milestone.milestone_reference_id);
        break;
      case 'assignment':
        isCompleted = await isAssignmentSubmitted(studentId, milestone.milestone_reference_id);
        break;
      case 'progress':
        const progressThreshold = getProgressThreshold(milestoneNumber);
        const progress = await calculateStudentCourseProgress(studentId, courseId);
        isCompleted = progress.progressPercentage >= progressThreshold;
        break;
      case 'completion':
        const completionProgress = await calculateStudentCourseProgress(studentId, courseId);
        isCompleted = completionProgress.isCompleted;
        break;
    }
    
    // If completed, mark it
    if (isCompleted && !milestone.completed_at) {
      await markMilestoneCompleted(studentId, courseId, milestoneNumber);
    }
    
    return isCompleted;
  } catch (error) {
    console.error('Error checking milestone completion:', error);
    throw error;
  }
}

/**
 * Award stamp for milestone
 * @param {string} studentId - Student UUID
 * @param {string} courseId - Course UUID
 * @param {number} milestoneNumber - Milestone number
 * @returns {Promise<Object>} Object with stampType and stampId
 */
export async function awardMilestoneStamp(studentId, courseId, milestoneNumber) {
  try {
    // Get milestone record
    const milestoneResult = await query(
      `SELECT * FROM student_course_milestones
       WHERE student_id = $1 AND course_id = $2 AND milestone_number = $3`,
      [studentId, courseId, milestoneNumber]
    );
    
    if (milestoneResult.rows.length === 0) {
      throw new Error('Milestone not found');
    }
    
    const milestone = milestoneResult.rows[0];
    
    // Check if already awarded
    if (milestone.stamp_awarded) {
      const stampResult = await query(
        `SELECT stamp_type FROM student_stamps
         WHERE milestone_id = $1`,
        [milestone.id]
      );
      return {
        stampType: stampResult.rows[0]?.stamp_type || 'finishing',
        alreadyAwarded: true,
        milestoneNumber,
      };
    }
    
    // Check if milestone is completed
    if (!milestone.completed_at) {
      throw new Error('Milestone is not completed');
    }
    
    // Determine stamp type
    const totalMilestones = await getTotalMilestonesForCourse(courseId, studentId);
    const stampType = determineStampType(milestoneNumber, totalMilestones);
    
    // Award stamp
    const stampResult = await query(
      `INSERT INTO student_stamps (student_id, course_id, milestone_id, stamp_type)
       VALUES ($1, $2, $3, $4)
       RETURNING id, stamp_type, awarded_at`,
      [studentId, courseId, milestone.id, stampType]
    );
    
    // Mark milestone as stamp awarded
    await query(
      `UPDATE student_course_milestones
       SET stamp_awarded = true
       WHERE id = $1`,
      [milestone.id]
    );
    
    return {
      stampType: stampResult.rows[0].stamp_type,
      stampId: stampResult.rows[0].id,
      awardedAt: stampResult.rows[0].awarded_at,
      alreadyAwarded: false,
      milestoneNumber,
    };
  } catch (error) {
    console.error('Error awarding milestone stamp:', error);
    throw error;
  }
}

/**
 * Get milestones for a student in a course
 * @param {string} studentId - Student UUID
 * @param {string} courseId - Course UUID
 * @returns {Promise<Array>} Array of milestone records
 */
export async function getCourseMilestones(studentId, courseId) {
  try {
    const result = await query(
      `SELECT * FROM student_course_milestones
       WHERE student_id = $1 AND course_id = $2
       ORDER BY milestone_number`,
      [studentId, courseId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting course milestones:', error);
    throw error;
  }
}

/**
 * Get stamp count for a student in a course
 * @param {string} studentId - Student UUID
 * @param {string} courseId - Course UUID
 * @returns {Promise<number>} Stamp count
 */
export async function getStampCount(studentId, courseId) {
  try {
    const result = await query(
      `SELECT COUNT(*) as count
       FROM student_stamps
       WHERE student_id = $1 AND course_id = $2`,
      [studentId, courseId]
    );
    return parseInt(result.rows[0]?.count || 0, 10);
  } catch (error) {
    console.error('Error getting stamp count:', error);
    throw error;
  }
}
