/**
 * Course Access Guard Component
 * 
 * Checks if student is enrolled in a course before allowing access.
 * Non-students (instructors, admins, superadmins) have full access.
 * 
 * Usage: <CourseAccessGuard courseId={courseId}>...</CourseAccessGuard>
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/index.js';
import { useCheckEnrollment } from '@/hooks/api/useEnrollment';
import SkeletonLoader from '@/components/shared/loading/SkeletonLoader';

const CourseAccessGuard = ({ courseId, children }) => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  // Check enrollment for students/alumni
  const { data: enrollmentData, isLoading: isLoadingEnrollment } = useCheckEnrollment(courseId, {
    enabled: isAuthenticated && !!courseId && (user?.role === 'student' || user?.role === 'alumni'),
  });

  useEffect(() => {
    if (!courseId) {
      setIsChecking(false);
      setHasAccess(false);
      return;
    }

    // If not authenticated, allow access (will be handled by other guards)
    if (!isAuthenticated || !user) {
      setIsChecking(false);
      setHasAccess(true);
      return;
    }

    const userRole = user.role;

    // Non-students (instructors, admins, superadmins) have full access
    if (userRole !== 'student' && userRole !== 'alumni') {
      setIsChecking(false);
      setHasAccess(true);
      return;
    }

    // For students/alumni, check enrollment
    if (userRole === 'student' || userRole === 'alumni') {
      if (isLoadingEnrollment) {
        return; // Still checking
      }

      const isEnrolled = enrollmentData?.isEnrolled || false;

      if (!isEnrolled) {
        // Redirect to forbidden page or course listing
        router.push(`/forbidden?error=You must be enrolled in this course to access it&redirect=${encodeURIComponent(`/courses`)}`);
        setIsChecking(false);
        setHasAccess(false);
        return;
      }

      setIsChecking(false);
      setHasAccess(true);
    }
  }, [courseId, isAuthenticated, user, enrollmentData, isLoadingEnrollment, router]);

  // Show loading state while checking
  if (isChecking || isLoadingEnrollment) {
    return (
      <div className="container py-10 md:py-50px lg:py-60px 2xl:py-100px">
        <SkeletonLoader type="card" className="h-96" />
      </div>
    );
  }

  // If no access, don't render children (redirect will happen)
  if (!hasAccess) {
    return null;
  }

  // Render children if access is granted
  return <>{children}</>;
};

export default CourseAccessGuard;

