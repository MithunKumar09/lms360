/**
 * Unit Tests for calculateScoreSummary Service
 */

import { calculateScoreSummary } from '@/services/reports/calculateScoreSummary.js';

jest.mock('@/lib/db/index.js', () => ({
  query: jest.fn(),
}));

import { query } from '@/lib/db/index.js';

describe('calculateScoreSummary', () => {
  const quizId = 'test-quiz-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate summary with mixed pass/fail attempts', async () => {
    query.mockResolvedValueOnce({
      rows: [{
        total_attempts: '4',
        passed_count: '3',
        failed_count: '1',
        average_score: '68.75',
        average_marks: '68.75',
        max_score: '90',
        min_score: '45',
        max_marks: '90',
        min_marks: '45',
        median_score: '70',
        q1_score: '50',
        q3_score: '85',
      }],
    });

    // Mock distribution query
    query.mockResolvedValueOnce({
      rows: [
        { score_range: '0-9', count: '0' },
        { score_range: '10-19', count: '0' },
        { score_range: '20-29', count: '0' },
        { score_range: '30-39', count: '0' },
        { score_range: '40-49', count: '1' },
        { score_range: '50-59', count: '0' },
        { score_range: '60-69', count: '1' },
        { score_range: '70-79', count: '0' },
        { score_range: '80-89', count: '1' },
        { score_range: '90-100', count: '1' },
      ],
    });

    const result = await calculateScoreSummary(quizId, 'instructor');

    expect(result.totalAttempts).toBe(4);
    expect(result.passedCount).toBe(3);
    expect(result.failedCount).toBe(1);
    expect(result.passRate).toBe(75);
    expect(result.averageScore).toBeCloseTo(68.75, 2);
    expect(result.maxScore).toBe(90);
    expect(result.minScore).toBe(45);
  });

  it('should handle no attempts', async () => {
    query.mockResolvedValueOnce({
      rows: [{
        total_attempts: '0',
        passed_count: '0',
        failed_count: '0',
        average_score: null,
        average_marks: null,
        max_score: null,
        min_score: null,
        max_marks: null,
        min_marks: null,
        median_score: null,
        q1_score: null,
        q3_score: null,
      }],
    });

    query.mockResolvedValueOnce({ rows: [] });

    const result = await calculateScoreSummary(quizId, 'instructor');

    expect(result.totalAttempts).toBe(0);
    expect(result.passedCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(result.passRate).toBe(0);
    expect(result.averageScore).toBeNull();
    expect(result.maxScore).toBeNull();
    expect(result.minScore).toBeNull();
  });

  it('should filter by studentId for student role', async () => {
    query.mockResolvedValueOnce({ 
      rows: [{ 
        total_attempts: '0', 
        passed_count: '0', 
        failed_count: '0', 
        average_score: null, 
        average_marks: null, 
        max_score: null, 
        min_score: null,
        max_marks: null,
        min_marks: null,
        median_score: null,
        q1_score: null,
        q3_score: null,
      }] 
    });
    query.mockResolvedValueOnce({ rows: [] });

    await calculateScoreSummary(quizId, 'student', { studentId: 'student-id' });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("qa.student_id = $"),
      expect.arrayContaining(['student-id'])
    );
  });

  it('should filter by orgId for admin role', async () => {
    query.mockResolvedValueOnce({ 
      rows: [{ 
        total_attempts: '0', 
        passed_count: '0', 
        failed_count: '0', 
        average_score: null, 
        average_marks: null, 
        max_score: null, 
        min_score: null,
        max_marks: null,
        min_marks: null,
        median_score: null,
        q1_score: null,
        q3_score: null,
      }] 
    });
    query.mockResolvedValueOnce({ rows: [] });

    await calculateScoreSummary(quizId, 'admin', { orgId: 'org-id' });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("q.org_id = $"),
      expect.arrayContaining(['org-id'])
    );
  });
});

