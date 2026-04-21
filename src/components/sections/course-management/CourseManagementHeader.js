'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Course Management Header Component
 * 
 * Professional header with breadcrumb navigation and page title.
 * 
 * @param {Object} props - Component props
 * @param {string} props.role - User role ('superadmin' | 'admin' | 'instructor')
 * @returns {JSX.Element} Header component
 */
const CourseManagementHeader = ({ role }) => {
  const pathname = usePathname();

  // Get role display name
  const getRoleDisplayName = () => {
    switch (role) {
      case 'superadmin':
        return 'Superadmin';
      case 'admin':
        return 'Admin';
      case 'instructor':
        return 'Instructor';
      default:
        return 'Dashboard';
    }
  };

  // Get dashboard path based on role
  const getDashboardPath = () => {
    switch (role) {
      case 'superadmin':
        return '/dashboards/superadmin-dashboard';
      case 'admin':
        return '/dashboards/admin-dashboard';
      case 'instructor':
        return '/dashboards/instructor-dashboard';
      default:
        return '/dashboards';
    }
  };

  return (
    <div className="container pb-30px">
      {/* Breadcrumb Navigation */}
      <nav className="mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2 text-sm text-contentColor/70 dark:text-contentColor-dark/70">
          <li>
            <Link
              href={getDashboardPath()}
              className="hover:text-primaryColor dark:hover:text-primaryColor transition-colors"
            >
              {getRoleDisplayName()} Dashboard
            </Link>
          </li>
          <li>
            <svg
              className="w-4 h-4 mx-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </li>
          <li className="text-contentColor dark:text-contentColor-dark font-medium">
            Course Management
          </li>
        </ol>
      </nav>

      {/* Page Title and Description */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-blackColor dark:text-blackColor-dark mb-3">
          Course Management
        </h1>
        <p className="text-base text-contentColor/70 dark:text-contentColor-dark/70">
          Manage and organize your courses. View, edit, delete, and control course status.
        </p>
      </div>
    </div>
  );
};

export default CourseManagementHeader;
