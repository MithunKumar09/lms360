/**
 * Unit Tests for Mini Courses API
 * 
 * Tests GET, POST, PUT, DELETE endpoints
 */

import { GET, POST } from '@/app/api/mini-courses/route.js';
import { createMockRequest, createMockSession, expectApiResponse } from '../../setup/test-helpers.js';

// Mock auth guards
jest.mock('@/lib/auth/guards.js', () => ({
  requireRole: jest.fn(),
}));

// Mock database
jest.mock('@/lib/db/index.js', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

describe('Mini Courses API', () => {
  let mockSession;
  const testOrgId = 'test-org-id';
  const testUserId = 'test-user-id';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSession = createMockSession({ role: 'admin', orgId: testOrgId, userId: testUserId });
    requireRole.mockResolvedValue(mockSession);
  });

  describe('GET /api/mini-courses', () => {
    it('should return list of mini courses for admin', async () => {
      const mockMiniCourses = [
        {
          id: '1',
          title: 'Test Mini Course',
          status: 'published',
          org_id: testOrgId,
        },
      ];

      query.mockResolvedValueOnce({
        rows: [{ total: '1' }],
      });
      query.mockResolvedValueOnce({
        rows: mockMiniCourses.map(mc => ({
          ...mc,
          created_by: testUserId,
          description: 'Test Description',
          cover_photo_url: 'https://example.com/cover.jpg',
          stamp_logo_url: 'https://example.com/logo.png',
          video_url: null,
          video_file_key: null,
          instructions: 'Test Instructions',
          material_url: null,
          material_file_key: null,
          created_at: new Date(),
          updated_at: new Date(),
          org_name: 'Test Org',
          created_by_email: 'admin@example.com',
        })),
      });

      const request = createMockRequest(mockSession);
      request.url = 'http://localhost:3000/api/mini-courses?page=1&limit=20';

      const response = await GET(request);
      const data = await response.json();

      expectApiResponse(data, true);
      expect(data.miniCourses).toBeDefined();
      expect(Array.isArray(data.miniCourses)).toBe(true);
      expect(data.pagination).toBeDefined();
    });

    it('should filter by status', async () => {
      query.mockResolvedValueOnce({ rows: [{ total: '0' }] });
      query.mockResolvedValueOnce({ rows: [] });

      const request = createMockRequest(mockSession);
      request.url = 'http://localhost:3000/api/mini-courses?status=draft';

      const response = await GET(request);
      const data = await response.json();

      expectApiResponse(data, true);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("mc.status = $"),
        expect.arrayContaining(['draft'])
      );
    });

    it('should restrict students to published only', async () => {
      const studentSession = createMockSession({ role: 'student' });
      requireRole.mockResolvedValueOnce(studentSession);

      query.mockResolvedValueOnce({ rows: [{ total: '0' }] });
      query.mockResolvedValueOnce({ rows: [] });

      const request = createMockRequest(studentSession);
      request.url = 'http://localhost:3000/api/mini-courses';

      await GET(request);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("mc.status = 'published'"),
        expect.any(Array)
      );
    });

    it('should return 403 for unauthorized roles', async () => {
      // Mock requireRole to throw a 403 error
      requireRole.mockImplementationOnce(() => {
        const error = new Error('Unauthorized');
        error.status = 403;
        throw error;
      });

      const request = createMockRequest();
      request.url = 'http://localhost:3000/api/mini-courses';

      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });
  });

  describe('POST /api/mini-courses', () => {
    it('should create mini course with valid data', async () => {
      const newMiniCourse = {
        title: 'New Mini Course',
        description: 'Test Description',
        coverPhotoUrl: 'https://example.com/cover.jpg',
        stampLogoUrl: 'https://example.com/logo.png',
        videoUrl: 'https://example.com/video.mp4',
        instructions: '<p>Test Instructions</p>',
      };

      query.mockResolvedValueOnce({
        rows: [{
          id: 'new-id',
          created_at: new Date(),
          updated_at: new Date(),
        }],
      });

      const request = createMockRequest(mockSession);
      request.json = jest.fn().mockResolvedValue(newMiniCourse);

      const response = await POST(request);
      const data = await response.json();

      expectApiResponse(data, true);
      expect(data.miniCourse).toBeDefined();
      expect(data.miniCourse.title).toBe(newMiniCourse.title);
    });

    it('should reject missing required fields', async () => {
      const invalidData = {
        title: 'Test',
        // Missing description, coverPhotoUrl, etc.
      };

      const request = createMockRequest(mockSession);
      request.json = jest.fn().mockResolvedValue(invalidData);

      const response = await POST(request);
      const data = await response.json();

      expectApiResponse(data, false);
      expect(data.error).toBeDefined();
    });

    it('should validate title length', async () => {
      const invalidData = {
        title: 'AB', // Too short
        description: 'Test',
        coverPhotoUrl: 'https://example.com/cover.jpg',
        stampLogoUrl: 'https://example.com/logo.png',
        instructions: '<p>Test</p>',
      };

      const request = createMockRequest(mockSession);
      request.json = jest.fn().mockResolvedValue(invalidData);

      const response = await POST(request);
      const data = await response.json();

      expectApiResponse(data, false);
    });
  });
});

