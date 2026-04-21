/**
 * API Endpoints
 * 
 * Centralized API endpoint definitions with type safety.
 * Provides consistent endpoint building and parameter handling.
 */

/**
 * API Endpoints Configuration
 */
const endpoints = {
  // Auth endpoints
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    session: '/auth/session',
    refresh: '/auth/refresh',
    passwordReset: {
      request: '/auth/password-reset/request',
      verify:  '/auth/password-reset/verify',
      complete: '/auth/password-reset/complete',
    },
  },

  // MFA endpoints
  mfa: {
    setup: '/auth/mfa/setup',
    verifySetup: '/auth/mfa/verify-setup',
    verify: '/auth/mfa/verify',
    backupCodes: '/auth/mfa/backup-codes',
  },

  // User endpoints
  user: {
    profile: '/user/profile',
    update: '/user/update',
    changePassword: '/user/change-password',
    socialLinks: '/user/social-links',
  },

  // Organizations endpoints
  organizations: {
    list: '/organizations',
    get: '/organizations/:id',
    create: '/organizations',
    update: '/organizations/:id',
    delete: '/organizations/:id',
    bulk: '/organizations/bulk',
    export: '/organizations/export',
    template: '/organizations/template',
  },

  // Users management endpoints
  users: {
    list: '/users',
    get: '/users/:id',
    create: '/users',
    update: '/users/:id',
    delete: '/users/:id',
    search: '/search/users',
  },

  // Invities (Invited Users) endpoints
  invities: {
    list: '/users/invitations',
    delete: '/users/invitations/:id',
  },

  // Announcements endpoints
  announcements: {
    list: '/announcements',
    get: '/announcements/:id',
    create: '/announcements',
    update: '/announcements/:id',
    delete: '/announcements/:id',
    bulk: '/announcements/bulk',
    public: '/announcements/public',
  },

  // Classes & Subjects endpoints
  classes: {
    list: '/classes',
    get: '/classes/:id',
    create: '/classes',
    update: '/classes/:id',
    delete: '/classes/:id',
  },

  subjects: {
    list: '/subjects',
    get: '/subjects/:id',
    create: '/subjects',
    update: '/subjects/:id',
    delete: '/subjects/:id',
  },

  offerings: {
    list: '/offerings',
    get: '/offerings/:id',
    create: '/offerings',
    update: '/offerings/:id',
    delete: '/offerings/:id',
  },

  // Cohorts (Classes) endpoints
  cohorts: {
    list: '/cohorts',
    get: '/cohorts/:id',
    create: '/cohorts',
    update: '/cohorts/:id',
    delete: '/cohorts/:id',
    exists: '/cohorts/exists',
    publish: '/cohorts/:id/publish',
    archive: '/cohorts/:id/archive',
    import: '/cohorts/import',
    export: '/cohorts/export',
  },

  // Course Settings endpoints
  courseSettings: {
    categories: '/course-settings/categories',
    subcategories: '/course-settings/subcategories',
    courseTypes: '/course-settings/types',
    programTypes: '/course-settings/program-types',
    courseLevels: '/course-settings/levels',
    courseSkills: '/course-settings/skills',
  },

  // Course Drafts endpoints
  drafts: {
    list: '/courses/drafts',
    get: '/courses/drafts/:id',
    create: '/courses/drafts',
    update: '/courses/drafts/:id',
    delete: '/courses/drafts/:id',
  },

  // Courses endpoints
  courses: {
    list: '/courses',
    get: '/courses/:id',
    create: '/courses',
    update: '/courses/:id',
    delete: '/courses/:id',
    publish: '/courses/:id/publish',
    management: '/courses/management',
    updateStatus: '/courses/:id/status',
    pin: '/courses/:id/pin',
    progress: '/courses/:id/progress',
  },

  // Reviews endpoints
  reviews: {
    dashboard: '/reviews/dashboard',
    course: '/courses/:id/reviews',
  },

  // Audit Logs endpoints
  auditLogs: {
    list: '/audit-logs',
  },

  // Upload endpoints
  upload: {
    file: '/upload',
  },

  // Wishlist endpoints
  wishlist: {
    list: '/wishlist',
    add: '/wishlist',
    remove: '/wishlist/:courseId',
    clear: '/wishlist/clear',
    check: '/wishlist/check/:courseId',
  },

  // Blogs endpoints
  blogs: {
    list: '/blogs',
    get: '/blogs/:id',
    create: '/blogs',
    update: '/blogs/:id',
    delete: '/blogs/:id',
    home: '/blogs/home',
    media: '/blogs/:id/media',
  },

  // Admin endpoints
  admin: {
    dashboard: {
      statistics: '/admin/dashboard/statistics',
      analytics: '/admin/dashboard/analytics',
    },
  },

  // Vendor endpoints
  vendor: {
    courses: {
      enrollments: '/vendor/courses/enrollments',
      courseEnrollments: '/vendor/courses/:id/enrollments',
    },
    enrollments: {
      students: '/vendor/enrollments/students',
    },
    dashboard: {
      statistics: '/vendor/dashboard/statistics',
      analytics: '/vendor/dashboard/analytics',
    },
    events: {
      registrations: '/vendor/events/registrations',
      eventRegistrations: '/vendor/events/:id/registrations',
      eventStatistics: '/vendor/events/:id/statistics',
      exportRegistrations: '/vendor/events/:id/registrations/export',
    },
    workshops: {
      registrations: '/vendor/workshops/registrations',
      workshopRegistrations: '/vendor/workshops/:id/registrations',
      workshopStatistics: '/vendor/workshops/:id/statistics',
      exportRegistrations: '/vendor/workshops/:id/registrations/export',
    },
    assignments: {
      export: '/vendor/assignments/export',
    },
    quizzes: {
      export: '/vendor/quizzes/export',
    },
    enrollments: {
      exportStudents: '/vendor/enrollments/students/export',
    },
    courses: {
      exportEnrollments: '/vendor/courses/enrollments/export',
    },
  },

  // Mentor endpoints
  mentor: {
    tasks: {
      list: '/mentors/tasks',
      get: '/mentors/tasks/:id',
      create: '/mentors/tasks',
      update: '/mentors/tasks/:id',
      delete: '/mentors/tasks/:id',
      attachments: {
        list: '/mentors/tasks/:id/attachments',
        upload: '/mentors/tasks/:id/attachments',
        delete: '/mentors/tasks/:id/attachments/:attachmentId',
      },
      comments: {
        list: '/mentors/tasks/:id/comments',
        add: '/mentors/tasks/:id/comments',
      },
    },
    sessions: {
      list: '/mentors/sessions',
      get: '/mentors/sessions/:id',
      create: '/mentors/sessions',
      update: '/mentors/sessions/:id',
      delete: '/mentors/sessions/:id',
    },
    materials: {
      list: '/mentors/materials',
      get: '/mentors/materials/:id',
      create: '/mentors/materials',
      update: '/mentors/materials/:id',
      delete: '/mentors/materials/:id',
    },
    notes: {
      list: '/mentors/notes',
      get: '/mentors/notes/:id',
      create: '/mentors/notes',
      update: '/mentors/notes/:id',
      delete: '/mentors/notes/:id',
    },
    classroom: '/mentors/classroom',
    activityFeed: '/mentors/activity-feed',
    feedback: '/mentors/feedback',
  },

  // Student endpoints
  student: {
    tasks: {
      list: '/students/tasks',
      updateStatus: '/students/tasks/:id/status',
    },
    mentors: '/students/mentors',
    activityFeed: '/students/activity-feed',
    mentorFeedback: '/students/mentors/:mentorId/feedback',
  },
};

/**
 * Build endpoint with parameters
 * @param {string} endpoint - Endpoint path
 * @param {Object} params - URL parameters
 * @returns {string} Built endpoint
 */
export const buildEndpoint = (endpoint, params = {}) => {
  let builtEndpoint = endpoint;

  // Replace path parameters
  Object.keys(params).forEach((key) => {
    builtEndpoint = builtEndpoint.replace(`:${key}`, params[key]);
  });

  return builtEndpoint;
};

/**
 * Build query string
 * @param {Object} params - Query parameters
 * @returns {string} Query string
 */
export const buildQueryString = (params = {}) => {
  const queryParams = new URLSearchParams();
  
  Object.keys(params).forEach((key) => {
    if (params[key] !== null && params[key] !== undefined) {
      queryParams.append(key, params[key]);
    }
  });

  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
};

/**
 * Build full URL with query parameters
 * @param {string} endpoint - Endpoint path
 * @param {Object} pathParams - Path parameters
 * @param {Object} queryParams - Query parameters
 * @returns {string} Full URL
 */
export const buildUrl = (endpoint, pathParams = {}, queryParams = {}) => {
  const builtEndpoint = buildEndpoint(endpoint, pathParams);
  const queryString = buildQueryString(queryParams);
  return `${builtEndpoint}${queryString}`;
};

/**
 * Get endpoint by key
 * @param {string} key - Endpoint key (e.g., 'auth.login')
 * @returns {string} Endpoint path
 */
export const getEndpoint = (key) => {
  const keys = key.split('.');
  let value = endpoints;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      throw new Error(`Endpoint not found: ${key}`);
    }
  }

  return value;
};

export default endpoints;


