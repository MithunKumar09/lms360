/**
 * Student Streak API Route (Production-Grade)
 * 
 * GET /api/students/streak - Get comprehensive student streak data
 * Includes: currentStreak, highestStreak, consistency, calendar
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getStudentStreakData } from '@/lib/services/streakService.js';

/**
 * GET /api/students/streak
 * 
 * Returns comprehensive student streak data:
 * - currentStreak: consecutive days with activity (0 if no activity today/yesterday)
 * - highestStreak: longest streak ever recorded
 * - consistency: percentage of days active (last 365 days)
 * - lastActiveDate: ISO date string of most recent activity
 * - calendar: array of {date, status} for current month
 * - source: 'activity' | 'new_user' | 'error'
 * 
 * @returns {Object} - Streak data
 * @example
 * {
 *   success: true,
 *   currentStreak: 12,
 *   highestStreak: 18,
 *   consistency: 25,
 *   lastActiveDate: "2026-01-14",
 *   calendar: [
 *     { date: "2026-01-01", status: "done" },
 *     { date: "2026-01-02", status: "missed" }
 *   ],
 *   source: "activity"
 * }
 */
export async function GET(request) {
  try {
    // Authentication: Only students and alumni can access
    const session = await requireRole(request, ['student', 'alumni']);

    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session invalid',
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Calculate streak with all metrics
    const streakData = await getStudentStreakData(userId);

    // If error occurred, return with error flag but still 200 (partial failure)
    if (streakData.source === 'error') {
      console.error('Streak calculation returned error:', streakData.error);
      return NextResponse.json(
        {
          success: false,
          error: streakData.error || 'Failed to calculate streak',
          currentStreak: 0,
          highestStreak: 0,
          consistency: 0,
          lastActiveDate: null,
          calendar: [],
          source: 'error',
        },
        {
          status: 500,
          headers: {
            'Cache-Control': 'private, max-age=60', // Short cache on error
          },
        }
      );
    }

    // Success: cache for 1 hour (streak doesn't change frequently)
    return NextResponse.json(
      {
        success: true,
        currentStreak: streakData.currentStreak,
        highestStreak: streakData.highestStreak,
        consistency: streakData.consistency,
        lastActiveDate: streakData.lastActiveDate,
        calendar: streakData.calendar,
        source: streakData.source,
      },
      {
        headers: {
          'Cache-Control': 'private, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching student streak:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch streak data',
        currentStreak: 0,
        highestStreak: 0,
        consistency: 0,
        lastActiveDate: null,
        calendar: [],
        source: 'error',
      },
      { 
        status: error.status || 500,
        headers: {
          'Cache-Control': 'private, max-age=60', // Short cache on error
        },
      }
    );
  }
}

