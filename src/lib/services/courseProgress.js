/**
 * Course Progress Calculation Service
 * 
 * Centralized service for calculating student course progress.
 * Implements the progress formula:
 * - Enrollment: 10%
 * - Lesson completion: 50%
 * - Assignments: 30%
 * - Quizzes: 10%
 * 
 * @module services/courseProgress
 */

import {
  getCourseTotalDuration,
  getStudentWatchedDuration,
  getStudentAssignmentScores,
  getStudentQuizScores,
  isStudentEnrolled,
} from '@/lib/db/courses/progress.js';

/**
 * Calculate student course progress
 * 
 * @param {string} studentId - Student UUID
 * @param {string} courseId - Course UUID
 * @returns {Promise<Object>} Progress object with breakdown
 */
export async function calculateStudentCourseProgress(studentId, courseId) {
  try {
    // Check enrollment (10%)
    const enrolled = await isStudentEnrolled(studentId, courseId);
    const enrollmentProgress = enrolled ? 10 : 0;

    // Calculate lesson progress (50%)
    const totalCourseDuration = await getCourseTotalDuration(courseId);
    const totalWatchedDuration = await getStudentWatchedDuration(studentId, courseId);
    
    let lessonProgress = 0;
    if (totalCourseDuration > 0) {
      const lessonProgressRatio = Math.min(totalWatchedDuration / totalCourseDuration, 1);
      lessonProgress = lessonProgressRatio * 50;
    }

    // Calculate assignment progress (30%)
    const assignmentScores = await getStudentAssignmentScores(studentId, courseId);
    let assignmentProgress = 0;
    if (assignmentScores.totalMarks > 0) {
      const assignmentRatio = Math.min(assignmentScores.obtainedMarks / assignmentScores.totalMarks, 1);
      assignmentProgress = assignmentRatio * 30;
    }

    // Calculate quiz progress (10%)
    const quizScores = await getStudentQuizScores(studentId, courseId);
    let quizProgress = 0;
    if (quizScores.totalMarks > 0) {
      const quizRatio = Math.min(quizScores.obtainedMarks / quizScores.totalMarks, 1);
      quizProgress = quizRatio * 10;
    }

    // Calculate final progress (sum all components, clamp 0-100)
    const finalProgress = Math.min(
      Math.max(
        enrollmentProgress + lessonProgress + assignmentProgress + quizProgress,
        0
      ),
      100
    );

    // Determine if course is completed
    // Course is completed if:
    // - Progress is 100% AND
    // - Student is enrolled AND
    // - All lessons are watched (or no lessons exist) AND
    // - All assignments are submitted (or no assignments exist) AND
    // - All quizzes are attempted (or no quizzes exist)
    const isCompleted = 
      finalProgress >= 100 &&
      enrolled &&
      (totalCourseDuration === 0 || totalWatchedDuration >= totalCourseDuration * 0.9) && // 90% watched threshold
      (assignmentScores.totalAssignments === 0 || assignmentScores.submittedAssignments === assignmentScores.totalAssignments) &&
      (quizScores.totalQuizzes === 0 || quizScores.attemptedQuizzes === quizScores.totalQuizzes);

    return {
      progressPercentage: Math.round(finalProgress * 100) / 100, // Round to 2 decimal places
      enrollmentProgress: Math.round(enrollmentProgress * 100) / 100,
      lessonProgress: Math.round(lessonProgress * 100) / 100,
      assignmentProgress: Math.round(assignmentProgress * 100) / 100,
      quizProgress: Math.round(quizProgress * 100) / 100,
      isCompleted,
      // Additional metadata
      metadata: {
        totalCourseDuration,
        totalWatchedDuration,
        assignmentScores,
        quizScores,
        enrolled,
      },
    };
  } catch (error) {
    console.error('Error calculating course progress:', error);
    throw error;
  }
}

