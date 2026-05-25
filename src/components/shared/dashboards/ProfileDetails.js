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
      <div className="mb-30px rounded-2xl border border-borderColor bg-whiteColor px-5 py-6 shadow-sm transition-all duration-300 dark:border-borderColor-dark dark:bg-whiteColor-dark md:px-8 md:py-8">
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
    <div className="mb-30px rounded-2xl border border-borderColor bg-whiteColor px-5 py-6 shadow-sm transition-all duration-300 dark:border-borderColor-dark dark:bg-whiteColor-dark md:px-8 md:py-8">
<div className="mb-8 flex flex-col gap-2 border-b border-borderColor pb-6 dark:border-borderColor-dark">
  <div className="flex items-center justify-between gap-4">
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-blackColor dark:text-blackColor-dark md:text-3xl">
        My Profile
      </h2>

      <p className="mt-1 text-sm text-contentColor dark:text-contentColor-dark">
        Personal information and academic details
      </p>
    </div>

    <div className="hidden rounded-xl border border-borderColor bg-lightGrey4 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primaryColor dark:border-borderColor-dark dark:bg-primaryColor/10 md:block">
      Active Profile
    </div>
  </div>
</div>

      <div>
<ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
  {[
    {
      label: "Registration Date",
      value: formatRegistrationDate(createdAt),
    },
    {
      label: "First Name",
      value: firstName || "--",
    },
    {
      label: "Last Name",
      value: lastName || "--",
    },
    {
      label: "Username",
      value: username || "--",
    },
    {
      label: "Email Address",
      value: email || "--",
    },
    {
      label: "Phone Number",
      value: phone || "--",
    },
    {
      label: "Expertise",
      value: skill || "--",
    },
    {
      label: "Organization",
      value: organizationName || "--",
    },
    {
      label: "Biography",
      value: bio || "--",
      full: true,
    },
  ].map((item, index) => (
    <li
      key={`${item.label}-${index}`}
      className={`group rounded-2xl border border-borderColor bg-white px-5 py-5 transition-all duration-300 hover:border-primaryColor/30 hover:shadow-md dark:border-borderColor-dark dark:bg-primaryColor/5 ${
        item.full ? "md:col-span-2 xl:col-span-3" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-contentColor dark:text-contentColor-dark">
          {item.label}
        </span>

        <span className="h-2 w-2 rounded-full bg-primaryColor/60 opacity-70 transition-all duration-300 group-hover:scale-125" />
      </div>

      <div className="break-words text-[15px] font-semibold leading-relaxed text-blackColor dark:text-blackColor-dark md:text-base">
        {item.value}
      </div>
    </li>
  ))}
</ul>

        {/* Student-Specific: Cohorts and Subjects Section */}
        {/* Always show section for students, even if empty (to indicate no assignments) */}
        {isStudent && (
          <div className="mt-10 rounded-2xl border border-borderColor bg-lightGrey4/40 p-5 dark:border-borderColor-dark dark:bg-primaryColor/5 md:p-7">
            <h3 className="mb-6 text-xl font-bold tracking-tight text-blackColor dark:text-blackColor-dark md:text-2xl">
              Academic Enrollments
            </h3>

<div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
  {/* Cohorts (Classes) Section */}
  {Array.isArray(studentCohorts) && studentCohorts.length > 0 && (
    <div>
                <h4 className="mb-5 flex items-center gap-2 text-lg font-semibold tracking-tight text-blackColor dark:text-blackColor-dark">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Classes ({studentCohorts.length})
                </h4>
                <div className="grid grid-cols-1 gap-5">
                  {studentCohorts
                    .filter(cohort => cohort && typeof cohort === 'object')
                    .map((cohort) => (
                      <div
                        key={cohort.id || Math.random()}
                        className="group h-full rounded-3xl border border-borderColor bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primaryColor/20 hover:shadow-xl dark:border-borderColor-dark dark:bg-whiteColor-dark"
                      >
                        <div className="mb-5 border-b border-borderColor/60 pb-4 text-lg font-bold tracking-tight text-blackColor dark:border-borderColor-dark/50 dark:text-blackColor-dark">
                          {cohort.code || 'N/A'}
                        </div>
                        {cohort.rollNo && (
                          <div className="flex items-start justify-between gap-4 border-b border-borderColor/50 py-3 text-sm leading-relaxed dark:border-borderColor-dark/40">
                            <span className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark">Roll Number:</span> {cohort.rollNo}
                          </div>
                        )}
                        {cohort.programNode && (
                          <div className="flex items-start justify-between gap-4 border-b border-borderColor/50 py-3 text-sm leading-relaxed dark:border-borderColor-dark/40">
                            <span className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark">Program:</span> {cohort.programNode?.title || cohort.programNode?.code || 'N/A'}
                          </div>
                        )}
                        {cohort.session && (
                          <div className="flex items-start justify-between gap-4 border-b border-borderColor/50 py-3 text-sm leading-relaxed dark:border-borderColor-dark/40">
                            <span className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark">Academic Year:</span> {cohort.session?.code || 'N/A'}
                            {cohort.session?.startDate && cohort.session?.endDate && (
                              <span className="mt-1 block text-right text-xs text-contentColor dark:text-contentColor-dark">
                                ({new Date(cohort.session.startDate).getFullYear()} - {new Date(cohort.session.endDate).getFullYear()})
                              </span>
                            )}
                          </div>
                        )}
                        {cohort.term && (
                          <div className="flex items-start justify-between gap-4 border-b border-borderColor/50 py-3 text-sm leading-relaxed dark:border-borderColor-dark/40">
                            <span className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark">Semester/Year:</span> {cohort.term?.label || 'N/A'}
                            {cohort.term?.number && (
                              <span className="mt-1 block text-right text-xs text-contentColor dark:text-contentColor-dark">(Year {cohort.term.number})</span>
                            )}
                          </div>
                        )}
                        {cohort.section && (
                          <div className="flex items-start justify-between gap-4 border-b border-borderColor/50 py-3 text-sm leading-relaxed dark:border-borderColor-dark/40">
                            <span className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark">Section:</span> {cohort.section?.label || 'N/A'}
                          </div>
                        )}
                        {cohort.level && (
                          <div className="mt-4 inline-flex w-fit rounded-full bg-primaryColor/10 px-3 py-1 text-xs font-semibold tracking-wide text-primaryColor">
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
                <h4 className="mb-5 flex items-center gap-2 text-lg font-semibold tracking-tight text-blackColor dark:text-blackColor-dark">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Subjects ({studentSubjects.length})
                </h4>
                <div className="grid grid-cols-1 gap-5">
                  {studentSubjects
                    .filter(item => item && typeof item === 'object' && item.subject && item.offering)
                    .map((item, index) => (
                      <div
                        key={`${item.subject?.id || ''}-${item.offering?.id || ''}-${index}`}
                        className="group h-full rounded-3xl border border-borderColor bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primaryColor/20 hover:shadow-xl dark:border-borderColor-dark dark:bg-whiteColor-dark"
                      >
                        <div className="mb-5 border-b border-borderColor/60 pb-4 text-lg font-bold tracking-tight text-blackColor dark:border-borderColor-dark/50 dark:text-blackColor-dark">
                          {item.subject?.title || item.subject?.code || 'N/A'}
                        </div>
                        {item.subject?.code && (
                          <div className="flex items-start justify-between gap-4 border-b border-borderColor/50 py-3 text-sm leading-relaxed dark:border-borderColor-dark/40">
                            <span className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark">Code:</span> {item.subject.code}
                          </div>
                        )}
                      {item.offering?.cohortCode && (
                        <div className="flex items-start justify-between gap-4 border-b border-borderColor/50 py-3 text-sm leading-relaxed dark:border-borderColor-dark/40">
                          <span className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark">Class:</span> {item.offering.cohortCode}
                        </div>
                      )}
                      {item.offering?.sessionCode && (
                        <div className="flex items-start justify-between gap-4 border-b border-borderColor/50 py-3 text-sm leading-relaxed dark:border-borderColor-dark/40">
                          <span className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark">Academic Year:</span> {item.offering.sessionCode}
                          {item.offering?.sessionStartDate && item.offering?.sessionEndDate && (
                            <span className="mt-1 block text-right text-xs text-contentColor dark:text-contentColor-dark">
                              ({new Date(item.offering.sessionStartDate).getFullYear()} - {new Date(item.offering.sessionEndDate).getFullYear()})
                            </span>
                          )}
                        </div>
                      )}
                      {item.offering?.termLabel && (
                        <div className="flex items-start justify-between gap-4 border-b border-borderColor/50 py-3 text-sm leading-relaxed dark:border-borderColor-dark/40">
                          <span className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark">Semester/Year:</span> {item.offering.termLabel}
                          {item.offering?.termNumber && (
                            <span className="mt-1 block text-right text-xs text-contentColor dark:text-contentColor-dark">(Year {item.offering.termNumber})</span>
                          )}
                        </div>
                      )}
                      {item.offering?.sectionLabel && (
                        <div className="flex items-start justify-between gap-4 border-b border-borderColor/50 py-3 text-sm leading-relaxed dark:border-borderColor-dark/40">
                          <span className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark">Section:</span> {item.offering.sectionLabel}
                        </div>
                      )}
                      {item.offering?.programNode && (
                        <div className="flex items-start justify-between gap-4 border-b border-borderColor/50 py-3 text-sm leading-relaxed dark:border-borderColor-dark/40">
                          <span className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark">Program:</span> {item.offering.programNode}
                        </div>
                      )}
                      {item.subject?.level && (
                        <div className="mt-4 inline-flex w-fit rounded-full bg-primaryColor/10 px-3 py-1 text-xs font-semibold tracking-wide text-primaryColor">
                          Level: {item.subject.level}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>

            {/* Empty State */}
            {studentCohorts.length === 0 && studentSubjects.length === 0 && (
              <div className="rounded-2xl border border-dashed border-borderColor bg-white px-6 py-10 text-center text-contentColor shadow-sm dark:border-borderColor-dark dark:bg-primaryColor/5 dark:text-contentColor-dark">
                <p className="text-base font-semibold text-blackColor dark:text-blackColor-dark">No academic enrollments found.</p>
                <p className="mt-2 text-sm leading-relaxed text-contentColor opacity-80 dark:text-contentColor-dark">
                  Contact your administrator to get enrolled in classes and subjects.
                </p>
              </div>
            )}
          </div>
        )}
        

        {/* Instructor-Specific: Classes and Subjects Section */}
        {/* Always show section for instructors, even if empty (to indicate no assignments) */}
        {isInstructor && (
          <div className="mt-10 rounded-2xl border border-borderColor bg-lightGrey4/40 p-5 dark:border-borderColor-dark dark:bg-primaryColor/5 md:p-7">
            <h3 className="mb-6 text-xl font-bold tracking-tight text-blackColor dark:text-blackColor-dark md:text-2xl">
              Teaching Assignments
            </h3>

<div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
  {/* Classes Section */}
  {instructorClasses.length > 0 && (
    <div>
                <h4 className="mb-5 flex items-center gap-2 text-lg font-semibold tracking-tight text-blackColor dark:text-blackColor-dark">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Classes ({instructorClasses.length})
                </h4>
                <div className="grid grid-cols-1 gap-5">
                  {Array.isArray(instructorClasses) && instructorClasses.map((classItem) => {
                    if (!classItem || typeof classItem !== 'object') {
                      return null;
                    }
                    return (
                      <div
                        key={classItem.id || Math.random()}
                        className="group h-full rounded-3xl border border-borderColor bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primaryColor/20 hover:shadow-xl dark:border-borderColor-dark dark:bg-whiteColor-dark"
                      >
                        <div className="mb-5 border-b border-borderColor/60 pb-4 text-lg font-bold tracking-tight text-blackColor dark:border-borderColor-dark/50 dark:text-blackColor-dark">
                          {classItem.code || 'N/A'}
                        </div>
                        {classItem.programNode && (
                          <div className="flex items-start justify-between gap-4 border-b border-borderColor/50 py-3 text-sm leading-relaxed dark:border-borderColor-dark/40">
                            <span className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark">Program:</span> {classItem.programNode?.title || classItem.programNode?.code || 'N/A'}
                          </div>
                        )}
                        {classItem.session && (
                          <div className="flex items-start justify-between gap-4 border-b border-borderColor/50 py-3 text-sm leading-relaxed dark:border-borderColor-dark/40">
                            <span className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark">Session:</span> {classItem.session?.name || classItem.session?.code || 'N/A'}
                          </div>
                        )}
                        {classItem.term && (
                          <div className="flex items-start justify-between gap-4 border-b border-borderColor/50 py-3 text-sm leading-relaxed dark:border-borderColor-dark/40">
                            <span className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark">Term:</span> {classItem.term?.label || 'N/A'} {classItem.term?.number ? `(Year ${classItem.term.number})` : ''}
                          </div>
                        )}
                        {classItem.section && (
                          <div className="text-sm text-contentColor dark:text-contentColor-dark">
                            <span className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark">Section:</span> {classItem.section?.label || 'N/A'}
                          </div>
                        )}
                        {classItem.level && (
                          <div className="mt-4 inline-flex w-fit rounded-full bg-primaryColor/10 px-3 py-1 text-xs font-semibold tracking-wide text-primaryColor">
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
                <h4 className="mb-5 flex items-center gap-2 text-lg font-semibold tracking-tight text-blackColor dark:text-blackColor-dark">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Subjects ({instructorSubjects.length})
                </h4>
                <div className="grid grid-cols-1 gap-5">
                  {Array.isArray(instructorSubjects) && instructorSubjects.map((item, index) => {
                    if (!item || typeof item !== 'object' || !item.subject || !item.offering) {
                      return null;
                    }
                    return (
                      <div
                        key={`${item.subject?.id || ''}-${item.offering?.id || ''}-${index}`}
                        className="group h-full rounded-3xl border border-borderColor bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primaryColor/20 hover:shadow-xl dark:border-borderColor-dark dark:bg-whiteColor-dark"
                      >
                        <div className="mb-5 border-b border-borderColor/60 pb-4 text-lg font-bold tracking-tight text-blackColor dark:border-borderColor-dark/50 dark:text-blackColor-dark">
                          {item.subject?.title || item.subject?.code || 'N/A'}
                        </div>
                        {item.subject?.code && (
                          <div className="flex items-start justify-between gap-4 border-b border-borderColor/50 py-3 text-sm leading-relaxed dark:border-borderColor-dark/40">
                            <span className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark">Code:</span> {item.subject.code}
                          </div>
                        )}
                        {item.offering?.cohortCode && (
                          <div className="flex items-start justify-between gap-4 border-b border-borderColor/50 py-3 text-sm leading-relaxed dark:border-borderColor-dark/40">
                            <span className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark">Class:</span> {item.offering.cohortCode}
                          </div>
                        )}
                        {item.offering?.sessionName && (
                          <div className="flex items-start justify-between gap-4 border-b border-borderColor/50 py-3 text-sm leading-relaxed dark:border-borderColor-dark/40">
                            <span className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark">Session:</span> {item.offering.sessionName}
                          </div>
                        )}
                        {item.offering?.termLabel && (
                          <div className="flex items-start justify-between gap-4 border-b border-borderColor/50 py-3 text-sm leading-relaxed dark:border-borderColor-dark/40">
                            <span className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark">Term:</span> {item.offering.termLabel} {item.offering?.termNumber ? `(Year ${item.offering.termNumber})` : ''}
                          </div>
                        )}
                        {item.offering.programNode && (
                          <div className="text-sm text-contentColor dark:text-contentColor-dark">
                            <span className="min-w-[120px] text-xs font-semibold uppercase tracking-wide text-contentColor dark:text-contentColor-dark">Program:</span> {item.offering.programNode}
                          </div>
                        )}
                        {item.subject.level && (
                          <div className="mt-4 inline-flex w-fit rounded-full bg-primaryColor/10 px-3 py-1 text-xs font-semibold tracking-wide text-primaryColor">
                            Level: {item.subject.level}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            </div>

            {/* Empty State */}
            {instructorClasses.length === 0 && instructorSubjects.length === 0 && (
              <div className="rounded-2xl border border-dashed border-borderColor bg-white px-6 py-10 text-center text-contentColor shadow-sm dark:border-borderColor-dark dark:bg-primaryColor/5 dark:text-contentColor-dark">
                <p className="text-base font-semibold text-blackColor dark:text-blackColor-dark">No teaching assignments found.</p>
                <p className="mt-2 text-sm leading-relaxed text-contentColor opacity-80 dark:text-contentColor-dark">
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
