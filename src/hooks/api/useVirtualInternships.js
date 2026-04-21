/**
 * React Query hooks for Virtual Internships
 * Mirrors assignment hooks structure
 */

import useSWR from 'swr';

// Simple fetcher function
const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    error.info = await res.json().catch(() => ({}));
    error.status = res.status;
    throw error;
  }
  return res.json();
};

/**
 * Fetch virtual internship programs
 * @param {Object} options - SWR options
 * @param {string|null} options.status - Filter by status
 * @param {number} options.page - Page number
 * @param {number} options.limit - Items per page
 */
export function useVirtualInternships(options = {}) {
  const { status = null, page = 1, limit = 20 } = options;
  
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  
  const { data, error, isLoading, mutate } = useSWR(
    `/api/virtual-internships?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
  
  return {
    programs: data?.programs || [],
    pagination: data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
    isLoading,
    isError: error,
    error,
    mutate,
  };
}

/**
 * Fetch single virtual internship program
 * @param {string} programId - Program ID
 */
export function useVirtualInternship(programId) {
  const { data, error, isLoading, mutate } = useSWR(
    programId ? `/api/virtual-internships/${programId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
  
  return {
    program: data?.program || null,
    isLoading,
    isError: error,
    error,
    mutate,
  };
}

/**
 * Fetch tasks for a virtual internship program
 * @param {string} programId - Program ID
 * @param {Object} options - SWR options
 * @param {string|null} options.status - Filter by status
 */
export function useVirtualInternshipTasks(programId, options = {}) {
  const { status = null } = options;
  
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  
  const { data, error, isLoading, mutate } = useSWR(
    programId ? `/api/virtual-internships/${programId}/tasks?${params.toString()}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
  
  return {
    tasks: data?.tasks || [],
    isLoading,
    isError: error,
    error,
    mutate,
  };
}

/**
 * Fetch task submissions (company view)
 * @param {string} taskId - Task ID
 * @param {Object} options - SWR options
 */
export function useTaskSubmissions(taskId, options = {}) {
  const { status = null } = options;
  
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  
  const { data, error, isLoading, mutate } = useSWR(
    taskId ? `/api/virtual-internships/tasks/${taskId}/submissions?${params.toString()}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
  
  return {
    submissions: data?.submissions || [],
    isLoading,
    isError: error,
    error,
    mutate,
  };
}

/**
 * Fetch student enrollments for virtual internship
 * @param {string} programId - Program ID
 */
export function useProgramEnrollments(programId) {
  const { data, error, isLoading, mutate } = useSWR(
    programId ? `/api/virtual-internships/${programId}/enrollments` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
  
  return {
    enrollments: data?.enrollments || [],
    isLoading,
    isError: error,
    error,
    mutate,
  };
}
