/**
 * Lesson API Route
 * 
 * GET /api/courses/:id/lessons/:lessonId - Get lesson details
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { getLesson, getAdjacentLessons, getWatchProgress } from '@/lib/db/lessons/index.js';
import { checkLessonAccess } from '@/lib/middleware/checkLessonAccess.js';

/**
 * GET /api/courses/:id/lessons/:lessonId
 * 
 * Get lesson details with course info and adjacent lessons
 */
export async function GET(request, { params }) {
  try {
    const { id: courseId, lessonId } = params;

    // Check user authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Check lesson access (payment check for paid courses)
    const accessCheck = await checkLessonAccess(userId, courseId, lessonId);
    
    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: accessCheck.reason,
          coursePrice: accessCheck.coursePrice,
        },
        { status: accessCheck.statusCode || 403 }
      );
    }

    // Get lesson data
    const lesson = await getLesson(courseId, lessonId);

    if (!lesson) {
      return NextResponse.json(
        { success: false, error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Get adjacent lessons (next/previous)
    const { nextLesson, previousLesson } = await getAdjacentLessons(courseId, lessonId);

    // Get watch progress (user is already authenticated)
    let watchProgress = null;
    try {
      const totalDuration = lesson.duration ? Math.floor(lesson.duration) : 0;
      watchProgress = await getWatchProgress(lessonId, userId, totalDuration);
    } catch (error) {
      // If watch progress fails, continue without it
      console.log('Could not get watch progress:', error.message);
    }

    // Get duration - prefer lesson duration, fallback to watch progress total duration
    let lessonDuration = lesson.duration ? Math.floor(lesson.duration) : 0;
    
    // If lesson duration is 0 or null, try to use watch progress total duration as fallback
    if (lessonDuration === 0 && watchProgress && watchProgress.total_duration) {
      lessonDuration = Math.floor(watchProgress.total_duration);
    }

    // Transform lesson data
    const transformedLesson = {
      id: lesson.id,
      courseId: lesson.course_id,
      chapterId: lesson.chapter_id,
      moduleId: lesson.module_id,
      type: lesson.type,
      title: lesson.title || '',
      description: lesson.description || '',
      duration: lessonDuration, // seconds
      videoUrl: lesson.video_url || '',
      textContent: lesson.text_content || '',
      quizId: lesson.quiz_id || null,
      assignmentId: lesson.assignment_id || null,
      materialUrl: lesson.material_url || '',
      order: lesson.order || 0,
      isPreview: lesson.is_preview || false,
      transcript: lesson.transcript || '',
      course: {
        id: courseId,
        title: lesson.course_title || ''
      },
      nextLesson,
      previousLesson,
      watchProgress: watchProgress ? {
        watchDuration: watchProgress.watch_duration || 0,
        totalDuration: watchProgress.total_duration || lessonDuration, // Use lesson duration if watch progress doesn't have it
        completed: watchProgress.completed || false,
        lastWatchedAt: watchProgress.last_watched_at
      } : null
    };

    return NextResponse.json({
      success: true,
      lesson: transformedLesson
    });
  } catch (error) {
    console.error('Error fetching lesson:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch lesson'
      },
      { status: 500 }
    );
  }
}

