/**
 * Unit Tests for Parent Dashboard UI Components
 * 
 * Tests conditional rendering and feature visibility based on permissions
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ParentDashboardMain from '@/components/layout/main/dashboards/ParentDashboardMain';
import ParentProgressOverview from '@/components/sections/sub-section/dashboards/ParentProgressOverview';
import ParentActivityTracker from '@/components/sections/sub-section/dashboards/ParentActivityTracker';
import ParentAchievements from '@/components/sections/sub-section/dashboards/ParentAchievements';

// Mock hooks
jest.mock('@/hooks/api/useParent', () => ({
  useParentStudents: jest.fn(),
  useParentDashboardStatistics: jest.fn(),
  useParentStudentProgress: jest.fn(),
  useParentStudentActivity: jest.fn(),
  useParentStudentAchievements: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/dashboards/parent-dashboard',
  }),
  useSearchParams: () => new URLSearchParams(),
}));

import { useParentStudents, useParentDashboardStatistics } from '@/hooks/api/useParent';

describe('Parent Dashboard UI Components', () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const renderWithQueryClient = (component) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('ParentDashboardMain', () => {
    it('should display child selector when no child is selected', () => {
      useParentStudents.mockReturnValue({
        data: { students: [] },
        isLoading: false,
        error: null,
      });
      useParentDashboardStatistics.mockReturnValue({
        data: { statistics: {} },
        isLoading: false,
        error: null,
      });

      renderWithQueryClient(<ParentDashboardMain />);

      expect(screen.getByText(/Select a child/i)).toBeInTheDocument();
    });

    it('should display empty state when no children are linked', () => {
      useParentStudents.mockReturnValue({
        data: { students: [] },
        isLoading: false,
        error: null,
      });
      useParentDashboardStatistics.mockReturnValue({
        data: { statistics: {} },
        isLoading: false,
        error: null,
      });

      renderWithQueryClient(<ParentDashboardMain />);

      expect(screen.getByText(/No Children Linked/i)).toBeInTheDocument();
    });

    it('should display summary cards when child is selected', async () => {
      const mockStudents = [
        { id: 'student-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      ];

      useParentStudents.mockReturnValue({
        data: { students: mockStudents },
        isLoading: false,
        error: null,
      });
      useParentDashboardStatistics.mockReturnValue({
        data: { statistics: {} },
        isLoading: false,
        error: null,
      });

      renderWithQueryClient(<ParentDashboardMain />);

      await waitFor(() => {
        expect(screen.getByText(/Summary/i)).toBeInTheDocument();
      });
    });
  });

  describe('ParentProgressOverview', () => {
    it('should show student selector when no student selected', () => {
      const { useParentStudentProgress } = require('@/hooks/api/useParent');
      useParentStudentProgress.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      renderWithQueryClient(<ParentProgressOverview />);

      expect(screen.getByText(/Please select a child/i)).toBeInTheDocument();
    });

    it('should display progress cards when student is selected and data is available', async () => {
      const { useParentStudentProgress } = require('@/hooks/api/useParent');
      useParentStudentProgress.mockReturnValue({
        data: {
          progress: {
            totalEnrollments: 5,
            averageCompletion: 75,
            attendancePercentage: 90,
            overallGrade: 'A',
            readinessScore: 85,
            milestonesCompleted: 10,
          },
        },
        isLoading: false,
        error: null,
      });

      // Mock useState to return a selected student
      const useStateSpy = jest.spyOn(React, 'useState');
      useStateSpy.mockImplementation((initial) => ['student-1', jest.fn()]);

      renderWithQueryClient(<ParentProgressOverview />);

      await waitFor(() => {
        expect(screen.getByText(/Course Enrollment/i)).toBeInTheDocument();
        expect(screen.getByText(/Completion Percentage/i)).toBeInTheDocument();
      });

      useStateSpy.mockRestore();
    });

    it('should show loading state while fetching data', () => {
      const { useParentStudentProgress } = require('@/hooks/api/useParent');
      useParentStudentProgress.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      const useStateSpy = jest.spyOn(React, 'useState');
      useStateSpy.mockImplementation((initial) => ['student-1', jest.fn()]);

      renderWithQueryClient(<ParentProgressOverview />);

      // Should show skeleton loaders
      expect(screen.getByText(/Student Progress Overview/i)).toBeInTheDocument();

      useStateSpy.mockRestore();
    });
  });

  describe('ParentActivityTracker', () => {
    it('should show student selector when no student selected', () => {
      const { useParentStudentActivity } = require('@/hooks/api/useParent');
      useParentStudentActivity.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      renderWithQueryClient(<ParentActivityTracker />);

      expect(screen.getByText(/Please select a child/i)).toBeInTheDocument();
    });

    it('should display activity tabs when student is selected', async () => {
      const { useParentStudentActivity } = require('@/hooks/api/useParent');
      useParentStudentActivity.mockReturnValue({
        data: {
          activity: {
            dailyLog: [
              { date: '2024-01-01', activitiesCount: 5, timeSpent: 3600, isActive: true },
            ],
          },
          engagement: {
            currentStreak: 5,
            totalTimeSpent: 18000,
            activeDaysCount: 7,
          },
        },
        isLoading: false,
        error: null,
      });

      const useStateSpy = jest.spyOn(React, 'useState');
      useStateSpy.mockImplementation((initial) => {
        if (typeof initial === 'string') {
          return ['week', jest.fn()]; // timeRange
        }
        return ['student-1', jest.fn()]; // selectedStudentId
      });

      renderWithQueryClient(<ParentActivityTracker />);

      await waitFor(() => {
        expect(screen.getByText(/DAILY ACTIVITY/i)).toBeInTheDocument();
        expect(screen.getByText(/ENGAGEMENT SUMMARY/i)).toBeInTheDocument();
      });

      useStateSpy.mockRestore();
    });
  });

  describe('ParentAchievements', () => {
    it('should show student selector when no student selected', () => {
      const { useParentStudentAchievements } = require('@/hooks/api/useParent');
      useParentStudentAchievements.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      renderWithQueryClient(<ParentAchievements />);

      expect(screen.getByText(/Please select a child/i)).toBeInTheDocument();
    });

    it('should display achievement tabs when student is selected', async () => {
      const { useParentStudentAchievements } = require('@/hooks/api/useParent');
      useParentStudentAchievements.mockReturnValue({
        data: {
          achievements: {
            badges: [
              { id: '1', name: 'First Course', icon: '🏅', earnedAt: '2024-01-01' },
            ],
            certificates: [],
            rewards: [],
            timeline: [],
          },
        },
        isLoading: false,
        error: null,
      });

      const useStateSpy = jest.spyOn(React, 'useState');
      useStateSpy.mockImplementation((initial) => ['student-1', jest.fn()]);

      renderWithQueryClient(<ParentAchievements />);

      await waitFor(() => {
        expect(screen.getByText(/BADGES/i)).toBeInTheDocument();
        expect(screen.getByText(/CERTIFICATES/i)).toBeInTheDocument();
        expect(screen.getByText(/REWARDS/i)).toBeInTheDocument();
      });

      useStateSpy.mockRestore();
    });
  });
});
