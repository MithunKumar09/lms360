"use client";
import React from "react";
import { useUser } from "@/hooks/api/useUser.js";
import { useAuthStore } from "@/store/index.js";

const ProfileDetails = () => {
  // Fetch current user data
  const { data: userData, isLoading } = useUser();
  
  // Get role from auth store as fallback
  const authUser = useAuthStore((state) => state.user);
  const authRole = authUser?.role;

  // Debug: Log complete user data
  React.useEffect(() => {
    if (userData) {
      console.log('📋 [PROFILE DETAILS] Complete user data received:', {
        full_userData: userData,
        user: userData?.user,
        orgId: userData?.user?.orgId,
        organizationName: userData?.user?.organizationName,
        role: userData?.user?.role,
        classes: userData?.user?.classes,
        subjects: userData?.user?.subjects,
        classesCount: userData?.user?.classes?.length || 0,
        subjectsCount: userData?.user?.subjects?.length || 0,
        all_user_fields: Object.keys(userData?.user || {}),
        authRole: authRole,
      });
    }
  }, [userData, authRole]);

  // Extract user information with fallbacks
  const firstName = userData?.user?.firstName || null;
  const lastName = userData?.user?.lastName || null;
  const email = userData?.user?.email || null;
  const username = userData?.user?.username || null;
  const phone = userData?.user?.phone || null;
  const skill = userData?.user?.skill || null;
  const bio = userData?.user?.bio || null;
  const createdAt = userData?.user?.createdAt || null;
  const organizationName = userData?.user?.organizationName || null;
  
  // Instructor-specific data
  const instructorClasses = Array.isArray(userData?.user?.classes) ? userData.user.classes : [];
  const instructorSubjects = Array.isArray(userData?.user?.subjects) ? userData.user.subjects : [];
  
  // Student-specific data
  const studentCohorts = Array.isArray(userData?.user?.cohorts) ? userData.user.cohorts : [];
  const studentSubjects = Array.isArray(userData?.user?.subjects) ? userData.user.subjects : [];
  
  // Get role from API response or auth store as fallback
  const userRole = userData?.user?.role || authRole || null;
  const isInstructor = userRole === 'instructor' || userRole === 'orginstructor';
  const isStudent = userRole === 'student' || userRole === 'orgstudent';
  
  // Debug logging for instructor detection
  React.useEffect(() => {
    if (userData && !isLoading) {
      console.log('👨‍🏫 [PROFILE DETAILS] Instructor check:', {
        userRole,
        authRole,
        isInstructor,
        classesCount: instructorClasses.length,
        subjectsCount: instructorSubjects.length,
        hasClasses: instructorClasses.length > 0,
        hasSubjects: instructorSubjects.length > 0,
        willShowSection: isInstructor && (instructorClasses.length > 0 || instructorSubjects.length > 0),
      });
    }
  }, [userData, isLoading, userRole, authRole, isInstructor, instructorClasses.length, instructorSubjects.length]);

  // Format registration date
  const formatRegistrationDate = (dateString) => {
    if (!dateString) return "--";
    try {
      const date = new Date(dateString);
      const options = {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      };
      return date.toLocaleDateString("en-US", options);
    } catch (error) {
      return "--";
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
          <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            My Profile
          </h2>
        </div>
        <div className="text-center py-10">
          <span className="text-contentColor dark:text-contentColor-dark">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
        <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
          My Profile
        </h2>
      </div>

      <div>
        <ul>
          <li className="text-lg text-contentColor dark:text-contentColor-dark leading-1.67 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 break-words">
            <div className="min-w-0">
              <span className="inline-block">Registration Date</span>
            </div>
            <div className="min-w-0 break-words">
              <span className="inline-block">{formatRegistrationDate(createdAt)}</span>
            </div>
          </li>

          <li className="text-lg text-contentColor dark:text-contentColor-dark leading-1.67 grid grid-cols-1 md:grid-cols-12 gap-x-30px mt-15px">
            <div className="min-w-0">
              <span className="inline-block">First Name</span>
            </div>
            <div className="min-w-0 break-words">
              <span className="inline-block">{firstName || "--"}</span>
            </div>
          </li>
          <li className="text-lg text-contentColor dark:text-contentColor-dark leading-1.67 grid grid-cols-1 md:grid-cols-12 gap-x-30px mt-15px">
            <div className="min-w-0">
              <span className="inline-block">Last Name</span>
            </div>
            <div className="min-w-0 break-words">
              <span className="inline-block">{lastName || "--"}</span>
            </div>
          </li>

          <li className="text-lg text-contentColor dark:text-contentColor-dark leading-1.67 grid grid-cols-1 md:grid-cols-12 gap-x-30px mt-15px">
            <div className="min-w-0">
              <span className="inline-block">Username</span>
            </div>
            <div className="min-w-0 break-words">
              <span className="inline-block">{username || "--"}</span>
            </div>
          </li>

          <li className="text-lg text-contentColor dark:text-contentColor-dark leading-1.67 grid grid-cols-1 md:grid-cols-12 gap-x-30px mt-15px">
            <div className="min-w-0">
              <span className="inline-block">Email</span>
            </div>
            <div className="min-w-0 break-words">
              <span className="inline-block">{email || "--"}</span>
            </div>
          </li>

          <li className="text-lg text-contentColor dark:text-contentColor-dark leading-1.67 grid grid-cols-1 md:grid-cols-12 gap-x-30px mt-15px">
            <div className="min-w-0">
              <span className="inline-block">Phone Number</span>
            </div>
            <div className="min-w-0 break-words">
              <span className="inline-block">{phone || "--"}</span>
            </div>
          </li>

          <li className="text-lg text-contentColor dark:text-contentColor-dark leading-1.67 grid grid-cols-1 md:grid-cols-12 gap-x-30px mt-15px">
            <div className="min-w-0">
              <span className="inline-block">Expert</span>
            </div>
            <div className="min-w-0 break-words">
              <span className="inline-block">{skill || "--"}</span>
            </div>
          </li>

          <li className="text-lg text-contentColor dark:text-contentColor-dark leading-1.67 grid grid-cols-1 md:grid-cols-12 gap-x-30px mt-15px">
            <div className="min-w-0">
              <span className="inline-block">Biography</span>
            </div>
            <div className="min-w-0 break-words">
              <span className="inline-block">{bio || "--"}</span>
            </div>
          </li>

          <li className="text-lg text-contentColor dark:text-contentColor-dark leading-1.67 grid grid-cols-1 md:grid-cols-12 gap-x-30px mt-15px">
            <div className="min-w-0">
              <span className="inline-block">Organization</span>
            </div>
            <div className="min-w-0 break-words">
              <span className="inline-block">{organizationName || "--"}</span>
            </div>
          </li>
        </ul>

        {/* Student-Specific: Cohorts and Subjects Section */}
        {/* Always show section for students, even if empty (to indicate no assignments) */}
        {isStudent && (
          <div className="mt-30px pt-30px border-t-2 border-borderColor dark:border-borderColor-dark">
            <h3 className="text-xl font-bold text-blackColor dark:text-blackColor-dark mb-20px">
              Academic Enrollments
            </h3>

            {/* Cohorts (Classes) Section */}
            {Array.isArray(studentCohorts) && studentCohorts.length > 0 && (
              <div className="mb-30px">
                <h4 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-15px flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Classes ({studentCohorts.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-15px">
                  {studentCohorts
                    .filter(cohort => cohort && typeof cohort === 'object')
                    .map((cohort) => (
                      <div
                        key={cohort.id || Math.random()}
                        className="p-15px bg-gray-50 dark:bg-gray-800 rounded-5 border border-borderColor dark:border-borderColor-dark hover:shadow-md transition-shadow"
                      >
                        <div className="font-semibold text-blackColor dark:text-blackColor-dark mb-8px">
                          {cohort.code || 'N/A'}
                        </div>
                        {cohort.rollNo && (
                          <div className="text-sm text-contentColor dark:text-contentColor-dark mb-5px">
                            <span className="font-medium">Roll Number:</span> {cohort.rollNo}
                          </div>
                        )}
                        {cohort.programNode && (
                          <div className="text-sm text-contentColor dark:text-contentColor-dark mb-5px">
                            <span className="font-medium">Program:</span> {cohort.programNode?.title || cohort.programNode?.code || 'N/A'}
                          </div>
                        )}
                        {cohort.session && (
                          <div className="text-sm text-contentColor dark:text-contentColor-dark mb-5px">
                            <span className="font-medium">Academic Year:</span> {cohort.session?.code || 'N/A'}
                            {cohort.session?.startDate && cohort.session?.endDate && (
                              <span className="text-xs ml-2">
                                ({new Date(cohort.session.startDate).getFullYear()} - {new Date(cohort.session.endDate).getFullYear()})
                              </span>
                            )}
                          </div>
                        )}
                        {cohort.term && (
                          <div className="text-sm text-contentColor dark:text-contentColor-dark mb-5px">
                            <span className="font-medium">Semester/Year:</span> {cohort.term?.label || 'N/A'}
                            {cohort.term?.number && (
                              <span className="text-xs ml-2">(Year {cohort.term.number})</span>
                            )}
                          </div>
                        )}
                        {cohort.section && (
                          <div className="text-sm text-contentColor dark:text-contentColor-dark mb-5px">
                            <span className="font-medium">Section:</span> {cohort.section?.label || 'N/A'}
                          </div>
                        )}
                        {cohort.level && (
                          <div className="text-xs text-contentColor dark:text-contentColor-dark mt-5px">
                            Level: {cohort.level}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Subjects Section */}
            {Array.isArray(studentSubjects) && studentSubjects.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-15px flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Subjects ({studentSubjects.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-15px">
                  {studentSubjects
                    .filter(item => item && typeof item === 'object' && item.subject && item.offering)
                    .map((item, index) => (
                      <div
                        key={`${item.subject?.id || ''}-${item.offering?.id || ''}-${index}`}
                        className="p-15px bg-gray-50 dark:bg-gray-800 rounded-5 border border-borderColor dark:border-borderColor-dark hover:shadow-md transition-shadow"
                      >
                        <div className="font-semibold text-blackColor dark:text-blackColor-dark mb-8px">
                          {item.subject?.title || item.subject?.code || 'N/A'}
                        </div>
                        {item.subject?.code && (
                          <div className="text-sm text-contentColor dark:text-contentColor-dark mb-5px">
                            <span className="font-medium">Code:</span> {item.subject.code}
                          </div>
                        )}
                      {item.offering?.cohortCode && (
                        <div className="text-sm text-contentColor dark:text-contentColor-dark mb-5px">
                          <span className="font-medium">Class:</span> {item.offering.cohortCode}
                        </div>
                      )}
                      {item.offering?.sessionCode && (
                        <div className="text-sm text-contentColor dark:text-contentColor-dark mb-5px">
                          <span className="font-medium">Academic Year:</span> {item.offering.sessionCode}
                          {item.offering?.sessionStartDate && item.offering?.sessionEndDate && (
                            <span className="text-xs ml-2">
                              ({new Date(item.offering.sessionStartDate).getFullYear()} - {new Date(item.offering.sessionEndDate).getFullYear()})
                            </span>
                          )}
                        </div>
                      )}
                      {item.offering?.termLabel && (
                        <div className="text-sm text-contentColor dark:text-contentColor-dark mb-5px">
                          <span className="font-medium">Semester/Year:</span> {item.offering.termLabel}
                          {item.offering?.termNumber && (
                            <span className="text-xs ml-2">(Year {item.offering.termNumber})</span>
                          )}
                        </div>
                      )}
                      {item.offering?.sectionLabel && (
                        <div className="text-sm text-contentColor dark:text-contentColor-dark mb-5px">
                          <span className="font-medium">Section:</span> {item.offering.sectionLabel}
                        </div>
                      )}
                      {item.offering?.programNode && (
                        <div className="text-sm text-contentColor dark:text-contentColor-dark mb-5px">
                          <span className="font-medium">Program:</span> {item.offering.programNode}
                        </div>
                      )}
                      {item.subject?.level && (
                        <div className="text-xs text-contentColor dark:text-contentColor-dark mt-5px">
                          Level: {item.subject.level}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {studentCohorts.length === 0 && studentSubjects.length === 0 && (
              <div className="text-center py-20px text-contentColor dark:text-contentColor-dark">
                <p className="text-base">No academic enrollments found.</p>
                <p className="text-sm mt-5px text-contentColor dark:text-contentColor-dark opacity-75">
                  Contact your administrator to get enrolled in classes and subjects.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Instructor-Specific: Classes and Subjects Section */}
        {/* Always show section for instructors, even if empty (to indicate no assignments) */}
        {isInstructor && (
          <div className="mt-30px pt-30px border-t-2 border-borderColor dark:border-borderColor-dark">
            <h3 className="text-xl font-bold text-blackColor dark:text-blackColor-dark mb-20px">
              Teaching Assignments
            </h3>

            {/* Classes Section */}
            {instructorClasses.length > 0 && (
              <div className="mb-30px">
                <h4 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-15px flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Classes ({instructorClasses.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-15px">
                  {Array.isArray(instructorClasses) && instructorClasses.map((classItem) => {
                    if (!classItem || typeof classItem !== 'object') {
                      return null;
                    }
                    return (
                      <div
                        key={classItem.id || Math.random()}
                        className="p-15px bg-gray-50 dark:bg-gray-800 rounded-5 border border-borderColor dark:border-borderColor-dark hover:shadow-md transition-shadow"
                      >
                        <div className="font-semibold text-blackColor dark:text-blackColor-dark mb-8px">
                          {classItem.code || 'N/A'}
                        </div>
                        {classItem.programNode && (
                          <div className="text-sm text-contentColor dark:text-contentColor-dark mb-5px">
                            <span className="font-medium">Program:</span> {classItem.programNode?.title || classItem.programNode?.code || 'N/A'}
                          </div>
                        )}
                        {classItem.session && (
                          <div className="text-sm text-contentColor dark:text-contentColor-dark mb-5px">
                            <span className="font-medium">Session:</span> {classItem.session?.name || classItem.session?.code || 'N/A'}
                          </div>
                        )}
                        {classItem.term && (
                          <div className="text-sm text-contentColor dark:text-contentColor-dark mb-5px">
                            <span className="font-medium">Term:</span> {classItem.term?.label || 'N/A'} {classItem.term?.number ? `(Year ${classItem.term.number})` : ''}
                          </div>
                        )}
                        {classItem.section && (
                          <div className="text-sm text-contentColor dark:text-contentColor-dark">
                            <span className="font-medium">Section:</span> {classItem.section?.label || 'N/A'}
                          </div>
                        )}
                        {classItem.level && (
                          <div className="text-xs text-contentColor dark:text-contentColor-dark mt-5px">
                            Level: {classItem.level}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Subjects Section */}
            {instructorSubjects.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-15px flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Subjects ({instructorSubjects.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-15px">
                  {Array.isArray(instructorSubjects) && instructorSubjects.map((item, index) => {
                    if (!item || typeof item !== 'object' || !item.subject || !item.offering) {
                      return null;
                    }
                    return (
                      <div
                        key={`${item.subject?.id || ''}-${item.offering?.id || ''}-${index}`}
                        className="p-15px bg-gray-50 dark:bg-gray-800 rounded-5 border border-borderColor dark:border-borderColor-dark hover:shadow-md transition-shadow"
                      >
                        <div className="font-semibold text-blackColor dark:text-blackColor-dark mb-8px">
                          {item.subject?.title || item.subject?.code || 'N/A'}
                        </div>
                        {item.subject?.code && (
                          <div className="text-sm text-contentColor dark:text-contentColor-dark mb-5px">
                            <span className="font-medium">Code:</span> {item.subject.code}
                          </div>
                        )}
                        {item.offering?.cohortCode && (
                          <div className="text-sm text-contentColor dark:text-contentColor-dark mb-5px">
                            <span className="font-medium">Class:</span> {item.offering.cohortCode}
                          </div>
                        )}
                        {item.offering?.sessionName && (
                          <div className="text-sm text-contentColor dark:text-contentColor-dark mb-5px">
                            <span className="font-medium">Session:</span> {item.offering.sessionName}
                          </div>
                        )}
                        {item.offering?.termLabel && (
                          <div className="text-sm text-contentColor dark:text-contentColor-dark mb-5px">
                            <span className="font-medium">Term:</span> {item.offering.termLabel} {item.offering?.termNumber ? `(Year ${item.offering.termNumber})` : ''}
                          </div>
                        )}
                        {item.offering.programNode && (
                          <div className="text-sm text-contentColor dark:text-contentColor-dark">
                            <span className="font-medium">Program:</span> {item.offering.programNode}
                          </div>
                        )}
                        {item.subject.level && (
                          <div className="text-xs text-contentColor dark:text-contentColor-dark mt-5px">
                            Level: {item.subject.level}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {instructorClasses.length === 0 && instructorSubjects.length === 0 && (
              <div className="text-center py-20px text-contentColor dark:text-contentColor-dark">
                <p className="text-base">No teaching assignments found.</p>
                <p className="text-sm mt-5px text-contentColor dark:text-contentColor-dark opacity-75">
                  Contact your administrator to get assigned to classes and subjects.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileDetails;
