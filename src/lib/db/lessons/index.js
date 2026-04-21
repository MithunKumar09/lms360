/**
 * Lesson Database Functions
 * 
 * Functions for managing lesson data and watch progress
 */

import { query } from '../index.js';

/**
 * Get lesson by ID with course information
 * @param {string} courseId - Course ID
 * @param {string} lessonId - Lesson ID
 * @returns {Promise<Object>} Lesson data with course info
 */
export async function getLesson(courseId, lessonId) {
  const lessonQuery = `
    SELECT 
      cl.id,
      cl.chapter_id,
      cl.lesson_type as type,
      cl.title,
      cl.description,
      COALESCE(cl.duration, 0) as duration,
      cl.video_url,
      cl.text_content,
      cl.quiz_id,
      cl.assignment_id,
      cl.material_url,
      cl.order_index as "order",
      cl.is_preview,
      cch.module_id,
      cm.course_id,
      c.title as course_title,
      (
        SELECT transcript_text
        FROM lesson_transcripts
        WHERE lesson_id = cl.id
        LIMIT 1
      ) as transcript
    FROM course_lessons cl
    JOIN course_chapters cch ON cl.chapter_id = cch.id
    JOIN course_modules cm ON cch.module_id = cm.id
    JOIN courses c ON cm.course_id = c.id
    WHERE cl.id = $1 AND cm.course_id = $2
  `;

  try {
    const result = await query(lessonQuery, [lessonId, courseId]);
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  } catch (error) {
    console.error('Error fetching lesson:', error);
    throw error;
  }
}

/**
 * Get next and previous lessons in the course
 * @param {string} courseId - Course ID
 * @param {string} lessonId - Current lesson ID
 * @returns {Promise<Object>} Next and previous lesson info
 */
export async function getAdjacentLessons(courseId, lessonId) {
  // Get current lesson's order and module info
  const currentLessonQuery = `
    SELECT 
      cl.order_index,
      cch.module_id,
      cm.order_index as module_order
    FROM course_lessons cl
    JOIN course_chapters cch ON cl.chapter_id = cch.id
    JOIN course_modules cm ON cch.module_id = cm.id
    WHERE cl.id = $1 AND cm.course_id = $2
  `;

  try {
    const currentResult = await query(currentLessonQuery, [lessonId, courseId]);
    if (currentResult.rows.length === 0) {
      return { nextLesson: null, previousLesson: null };
    }

    const current = currentResult.rows[0];

    // Get all lessons in course ordered by module and lesson order
    const allLessonsQuery = `
      SELECT 
        cl.id,
        cl.title,
        cl.order_index,
        cch.module_id,
        cm.order_index as module_order
      FROM course_lessons cl
      JOIN course_chapters cch ON cl.chapter_id = cch.id
      JOIN course_modules cm ON cch.module_id = cm.id
      WHERE cm.course_id = $1
      ORDER BY cm.order_index, cch.order_index, cl.order_index
    `;

    const allLessonsResult = await query(allLessonsQuery, [courseId]);
    const lessons = allLessonsResult.rows;

    // Find current lesson index
    const currentIndex = lessons.findIndex(
      l => l.id === lessonId && 
           l.module_id === current.module_id && 
           l.order_index === current.order_index
    );

    if (currentIndex === -1) {
      return { nextLesson: null, previousLesson: null };
    }

    const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;
    const previousLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;

    return {
      nextLesson: nextLesson ? { id: nextLesson.id, title: nextLesson.title } : null,
      previousLesson: previousLesson ? { id: previousLesson.id, title: previousLesson.title } : null
    };
  } catch (error) {
    console.error('Error fetching adjacent lessons:', error);
    throw error;
  }
}

/**
 * Get or create watch progress for a lesson
 * @param {string} lessonId - Lesson ID
 * @param {string} userId - User ID
 * @param {number} totalDuration - Total lesson duration in seconds
 * @returns {Promise<Object>} Watch progress data
 */
export async function getWatchProgress(lessonId, userId, totalDuration) {
  const getQuery = `
    SELECT *
    FROM lesson_watch_progress
    WHERE lesson_id = $1 AND user_id = $2
  `;

  try {
    const result = await query(getQuery, [lessonId, userId]);
    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Create new progress record
    const insertQuery = `
      INSERT INTO lesson_watch_progress (lesson_id, user_id, total_duration)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const insertResult = await query(insertQuery, [lessonId, userId, totalDuration]);
    return insertResult.rows[0];
  } catch (error) {
    console.error('Error getting watch progress:', error);
    throw error;
  }
}

/**
 * Update watch progress for a lesson
 * @param {string} lessonId - Lesson ID
 * @param {string} userId - User ID
 * @param {number} watchDuration - Watch duration in seconds
 * @param {number} totalDuration - Total lesson duration in seconds
 * @param {boolean} completed - Whether lesson is completed
 * @returns {Promise<Object>} Updated watch progress
 */
export async function updateWatchProgress(lessonId, userId, watchDuration, totalDuration, completed = false) {
  const updateQuery = `
    INSERT INTO lesson_watch_progress (lesson_id, user_id, watch_duration, total_duration, completed, last_watched_at)
    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    ON CONFLICT (lesson_id, user_id)
    DO UPDATE SET
      watch_duration = GREATEST(EXCLUDED.watch_duration, lesson_watch_progress.watch_duration),
      total_duration = EXCLUDED.total_duration,
      completed = EXCLUDED.completed OR lesson_watch_progress.completed,
      last_watched_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  try {
    const result = await query(updateQuery, [lessonId, userId, watchDuration, totalDuration, completed]);
    return result.rows[0];
  } catch (error) {
    console.error('Error updating watch progress:', error);
    throw error;
  }
}

