/**
 * API Client
 * 
 * Centralized API client with request/response interceptors.
 * Handles authentication, token refresh, and error handling.
 * 
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Whether request was successful
 * @property {*} data - Response data
 * @property {string|null} error - Error message if any
 * @property {number} status - HTTP status code
 */

/**
 * Base API URL
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

/**
 * Get auth token from Zustand store
 * Uses dynamic import to avoid circular dependencies
 */
const getAuthToken = async () => {
  if (typeof window === 'undefined') return null;
  
  try {
    // Dynamically import to avoid circular dependencies
    const { useAuthStore } = await import('@/store/index.js');
    return useAuthStore.getState().sessionToken;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Cache the store import to avoid repeated async imports
let authStoreCache = null;
const getAuthStore = async () => {
  if (!authStoreCache) {
    const storeModule = await import('@/store/index.js');
    authStoreCache = storeModule.useAuthStore;
  }
  return authStoreCache;
};

/**
 * Get auth token synchronously (for use in request method)
 * Uses cached store reference
 */
const getAuthTokenSync = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    // Use cached store if available, otherwise return null
    // This will be populated on first async call
    if (authStoreCache) {
      return authStoreCache.getState().sessionToken;
    }
    // If not cached yet, try to get it synchronously (fallback)
    // This is a workaround - ideally we'd make request() async
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Set auth token in Zustand store
 * Uses dynamic import to avoid circular dependencies
 */
const setAuthToken = async (token, refreshToken = null, expiresAt = null) => {
  if (typeof window === 'undefined') return;
  
  try {
    // Dynamically import to avoid circular dependencies
    const store = await getAuthStore();
    store.getState().refreshSession(token, refreshToken, expiresAt);
  } catch (error) {
    console.error('Error setting auth token:', error);
  }
};

/**
 * Refresh token if expired
 * Handles automatic token refresh with rotation
 */
let isRefreshing = false;
let refreshPromise = null;

const refreshToken = async () => {
  // If already refreshing, return the existing promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Include cookies (refresh token)
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.accessToken) {
          // Update auth store with new tokens
          setAuthToken(
            data.accessToken,
            data.refreshToken || null,
            data.expiresAt ? new Date(data.expiresAt) : null
          );
          return data.accessToken;
        }
      } else if (response.status === 401) {
        // Refresh token is invalid, logout user
        // Use clearAuth instead of logout to avoid API call
        if (typeof window !== 'undefined') {
          try {
            const { useAuthStore } = await import('@/store/index.js');
            // Clear auth state directly (no API call needed)
            useAuthStore.getState().clearAuth();
            // Clear localStorage explicitly
            if (window.localStorage) {
              try {
                window.localStorage.removeItem('auth-storage');
              } catch (e) {
                console.error('Error clearing localStorage:', e);
              }
            }
            // Clear API client cache
            authStoreCache = null;
            window.location.href = '/login';
          } catch (error) {
            console.error('Error during logout:', error);
            window.location.href = '/login';
          }
        }
        throw new Error('Refresh token expired');
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

/**
 * API Client Class
 */
class ApiClient {
  constructor(baseURL = BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Clear cached authentication tokens
   * Called on logout to ensure no tokens are reused
   */
  clearAuthCache() {
    // Clear auth store cache reference
    authStoreCache = null;
    
    // Clear any in-memory token references
    if (typeof window !== 'undefined') {
      try {
        // Force clear the cached store reference
        authStoreCache = null;
        console.log('✅ [API CLIENT] Auth cache cleared');
      } catch (error) {
        console.error('❌ [API CLIENT] Error clearing auth cache:', error);
      }
    }
  }

  /**
   * Make API request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise<ApiResponse>} API response
   */
  async request(endpoint, options = {}) {
    // Handle full URLs - don't prepend baseURL if endpoint is already a full URL
    const isFullUrl = endpoint.startsWith('http://') || endpoint.startsWith('https://');
    const url = isFullUrl ? endpoint : `${this.baseURL}${endpoint}`;
    
    // Initialize auth store cache if needed
    if (!authStoreCache && typeof window !== 'undefined') {
      try {
        const storeModule = await import('@/store/index.js');
        authStoreCache = storeModule.useAuthStore;
      } catch (error) {
        // Ignore error, will retry later
      }
    }
    
    const token = getAuthTokenSync();

    // Default headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add auth token if available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Merge options
    const config = {
      ...options,
      headers,
      credentials: 'include',
    };

    try {
      const response = await fetch(url, config);
      
      // Extract ETag from response headers for caching
      const etag = response.headers.get('ETag');
      
      // Handle 304 Not Modified (conditional GET with ETag)
      if (response.status === 304) {
        return {
          success: true,
          notModified: true,
          etag,
          status: 304,
        };
      }
      
      // Try to parse JSON response, but handle non-JSON responses (like HTML 404 pages)
      let data;
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      
      try {
        if (isJson) {
          data = await response.json();
        } else {
          // Non-JSON response (likely HTML error page)
          const text = await response.text();
          console.error('🔴 [API CLIENT] Non-JSON response received:', {
            status: response.status,
            contentType,
            endpoint,
            preview: text.substring(0, 200),
          });
          
          // Return error structure for non-JSON responses
          data = {
            success: false,
            error: `Server returned non-JSON response (${response.status})`,
            message: response.status === 404 
              ? 'Endpoint not found' 
              : `Server error: ${response.status}`,
          };
        }
      } catch (parseError) {
        console.error('🔴 [API CLIENT] Failed to parse response:', parseError);
        data = {
          success: false,
          error: 'Failed to parse server response',
          message: parseError.message || 'Invalid response format',
        };
      }

      // Handle token refresh on 401 - BUT NOT for authentication endpoints
      // Authentication endpoints (login, MFA verify, etc.) should not trigger refresh
      const isAuthEndpoint = 
        endpoint.includes('/auth/login') ||
        endpoint.includes('/auth/mfa/verify') ||
        endpoint.includes('/auth/mfa/setup') ||
        endpoint.includes('/auth/mfa/verify-setup') ||
        endpoint.includes('/auth/logout') ||
        endpoint.includes('/auth/refresh');
      
      if (response.status === 401 && !isAuthEndpoint) {
        console.log('🔄 [API CLIENT] 401 received, attempting token refresh...', { endpoint });
        try {
          const newToken = await refreshToken();
          if (newToken) {
            console.log('🔄 [API CLIENT] ✅ Token refreshed, retrying request...');
            // Retry request with new token
            headers['Authorization'] = `Bearer ${newToken}`;
            const retryResponse = await fetch(url, { ...config, headers });
            let retryData;
            try {
              const retryContentType = retryResponse.headers.get('content-type');
              const retryIsJson = retryContentType && retryContentType.includes('application/json');
              if (retryIsJson) {
                retryData = await retryResponse.json();
              } else {
                const retryText = await retryResponse.text();
                console.error('🔴 [API CLIENT] Retry returned non-JSON response:', {
                  status: retryResponse.status,
                  contentType: retryContentType,
                  preview: retryText.substring(0, 200),
                });
                retryData = {
                  success: false,
                  error: `Server returned non-JSON response (${retryResponse.status})`,
                };
              }
            } catch (parseError) {
              console.error('🔴 [API CLIENT] Failed to parse retry response:', parseError);
              retryData = {
                success: false,
                error: 'Failed to parse server response',
              };
            }
            console.log('🔄 [API CLIENT] ✅ Retry request completed:', { status: retryResponse.status });
            return {
              success: retryResponse.ok,
              ...retryData, // Spread response data
              error: retryResponse.ok ? null : retryData.error || retryData.message || 'Request failed',
              status: retryResponse.status,
            };
          }
        } catch (refreshError) {
          // If refresh fails, return original 401 response
          // The error will be handled by the caller
          console.error('🔄 [API CLIENT] ❌ Token refresh failed:', refreshError);
          console.log('🔄 [API CLIENT] Returning original 401 response');
        }
      } else if (response.status === 401 && isAuthEndpoint) {
        console.log('🔄 [API CLIENT] 401 on auth endpoint, skipping refresh (expected during login/MFA flow)');
      }

      // Return response with spread data for easy access
      // API returns data directly, so we spread it
      return {
        success: response.ok,
        ...data, // Spread response data (user, requiresMfa, error, etc.)
        error: response.ok ? null : data.error || data.message || 'Request failed',
        status: response.status,
        etag, // Include ETag for caching
        // Include additional properties for better error handling
        accountLocked: data.accountLocked || false,
        rateLimited: data.rateLimited || false,
        requiresMfa: data.requiresMfa || false,
      };
    } catch (error) {
      // Detect network/connectivity failures (TypeError from fetch()) separately
      // from auth failures. A network error is recoverable — do not treat as
      // session expiry and do not trigger logout or login redirect.
      const isNetworkError =
        error instanceof TypeError ||
        (typeof error.message === 'string' && (
          error.message.toLowerCase().includes('networkerror') ||
          error.message.toLowerCase().includes('failed to fetch') ||
          error.message.toLowerCase().includes('network request failed')
        ));

      if (isNetworkError) {
        console.warn('🌐 [API CLIENT] Network error (recoverable, no logout):', error.message);
        return {
          success: false,
          data: null,
          error: 'Connection failed. Please check your internet connection.',
          isNetworkError: true,
          status: 0,
        };
      }

      // Non-network error — route through error handler for classification
      try {
        const { handleApiError } = await import('@/lib/errors/globalErrorHandler.js');
        const errorHandling = handleApiError(error, {
          endpoint,
          method: options.method || 'GET',
        });

        console.error('API request error:', errorHandling);
        return {
          success: false,
          data: null,
          error: errorHandling.message || 'Request failed',
          isNetworkError: false,
          status: 0,
        };
      } catch (importError) {
        // Fallback if error handler import fails
        console.error('API request error:', error);
        return {
          success: false,
          data: null,
          error: error.message || 'Request failed',
          isNetworkError: false,
          status: 0,
        };
      }
    }
  }

  /**
   * GET request with ETag support for conditional requests
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @param {string|null} etag - ETag for conditional GET (If-None-Match header)
   * @returns {Promise<ApiResponse>} API response
   */
  async get(endpoint, params = {}, etag = null) {
    // Filter out null and undefined values from params to avoid sending them as query parameters
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== null && value !== undefined)
    );
    const queryString = new URLSearchParams(cleanParams).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    const headers = {};
    if (etag) {
      headers['If-None-Match'] = etag;
    }
    
    return this.request(url, { method: 'GET', headers });
  }

  /**
   * POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} body - Request body
   * @param {Object} params - Query parameters
   * @returns {Promise<ApiResponse>} API response
   */
  async post(endpoint, body = {}, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} body - Request body
   * @param {Object} params - Query parameters
   * @returns {Promise<ApiResponse>} API response
   */
  async put(endpoint, body = {}, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * PATCH request
   * @param {string} endpoint - API endpoint
   * @param {Object} body - Request body
   * @param {Object} params - Query parameters
   * @returns {Promise<ApiResponse>} API response
   */
  async patch(endpoint, body = {}, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  /**
   * DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<ApiResponse>} API response
   */
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;

