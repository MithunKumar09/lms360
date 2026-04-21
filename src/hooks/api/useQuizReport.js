/**
 * useQuizReport API Hooks
 * 
 * React Query hooks for fetching and generating quiz reports
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert';

/**
 * useQuizReport Query Hook
 * 
 * Fetches comprehensive analytics report for a quiz
 * 
 * @param {string} quizId - Quiz ID
 * @param {string} reportType - Report type (student | instructor | admin | superadmin)
 * @param {Object} options - Query options
 * @returns {Object} Report query
 */
export const useQuizReport = (quizId, reportType = null, options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;
  const finalReportType = reportType || userRole;

  return useQuery({
    queryKey: ['quiz-report', quizId, finalReportType],
    queryFn: async () => {
      const response = await apiClient.get(`/quizzes/${quizId}/reports`, {
        type: finalReportType,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch report');
      }

      return response;
    },
    enabled: isAuthenticated && !!quizId && !!finalReportType && (options.enabled !== false),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

/**
 * useGeneratePDFReport Mutation Hook
 * 
 * Generates a PDF report for a quiz
 * 
 * @returns {Object} Generate PDF mutation
 */
export const useGeneratePDFReport = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;

  return useMutation({
    mutationFn: async ({ quizId, reportType = null, includeCharts = true }) => {
      const finalReportType = reportType || userRole;
      
      const response = await apiClient.post(`/quizzes/${quizId}/reports/generate`, {
        reportType: finalReportType,
        includeCharts,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate PDF report');
      }

      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate report query to refresh data
      queryClient.invalidateQueries({ queryKey: ['quiz-report', variables.quizId] });
      
      // Trigger PDF download
      if (data.pdfDataUrl) {
        const link = document.createElement('a');
        link.href = data.pdfDataUrl;
        link.download = `quiz-report-${variables.quizId}-${new Date().getTime()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (data.pdfBuffer) {
        // Convert base64 to blob and download
        const byteCharacters = atob(data.pdfBuffer);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `quiz-report-${variables.quizId}-${new Date().getTime()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      createAlert({
        icon: 'success',
        title: 'PDF Generated!',
        text: 'Your report PDF has been downloaded successfully.',
      });
    },
    onError: (error) => {
      console.error('Error generating PDF report:', error);
      
      const errorMessage = error.message || 'Failed to generate PDF report. Please try again.';
      const isPermissionError = errorMessage.toLowerCase().includes('permission') || errorMessage.toLowerCase().includes('access');
      const isNotFoundError = errorMessage.toLowerCase().includes('not found');
      const isEmptyError = errorMessage.toLowerCase().includes('no attempts');
      
      createAlert({
        icon: isEmptyError ? 'info' : 'error',
        title: isEmptyError ? 'No Data Available' : 'Error',
        text: isEmptyError
          ? 'Cannot generate PDF: No attempts found for this quiz.'
          : isPermissionError
          ? 'You do not have permission to generate this report.'
          : isNotFoundError
          ? 'Quiz not found.'
          : errorMessage,
      });
    },
  });
};

export default useQuizReport;

