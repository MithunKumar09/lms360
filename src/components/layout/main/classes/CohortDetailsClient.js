'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/index.js';

export default function CohortDetailsClient({ cohortId }) {
  const user = useAuthStore((s) => s.user);
  const orgId = user?.orgId;
  const searchParams = useSearchParams();
  const orgIdFromQuery = searchParams?.get('orgId') || null;
  const [sessionOrgId, setSessionOrgId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [cohort, setCohort] = useState(null);
  const [subjects, setSubjects] = useState([]);

  const normalizeCohort = (c) => {
    if (!c || typeof c !== 'object') return c;
    return {
      ...c,
      program_node: c.program_node || (c.program_node_title || c.program_node_code
        ? { title: c.program_node_title, code: c.program_node_code, type: c.program_node_type }
        : undefined),
      section: c.section || (c.section_label ? { label: c.section_label, capacity: c.section_capacity, room: c.section_room } : undefined),
      term: c.term || (c.term_label ? { label: c.term_label, term_type: c.term_type } : undefined),
      session: c.session || (c.session_code ? { code: c.session_code, start_date: c.session_start_date, end_date: c.session_end_date } : undefined),
    };
  };

  // Fallback: if orgId not present (e.g., superadmin landing directly), read from session API
  useEffect(() => {
    if (orgId || sessionOrgId) return;
    (async () => {
      try {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.log('[DEV] CohortDetailsClient: orgId missing in store, fetching session...');
        }
        const res = await fetch('/api/auth/session', { credentials: 'include' });
        const data = await res.json();
        if (data?.user?.orgId) {
          setSessionOrgId(data.user.orgId);
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.log('[DEV] CohortDetailsClient: session provided orgId', data.user.orgId);
          }
        } else if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn('[DEV] CohortDetailsClient: session did not include orgId (likely superadmin without selection)');
        }
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.error('[DEV] CohortDetailsClient: session fetch failed', e);
        }
      }
    })();
  }, [orgId, sessionOrgId]);

  const effectiveOrgId = orgIdFromQuery || orgId || sessionOrgId;

  useEffect(() => {
    if (!effectiveOrgId || !cohortId) return;
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const [cohortRes, subjectsRes] = await Promise.all([
          fetch(`/api/cohorts/${cohortId}?orgId=${effectiveOrgId}`, { credentials: 'include' }),
          fetch(`/api/subject-offerings?cohort_id=${cohortId}&orgId=${effectiveOrgId}`, { credentials: 'include' }),
        ]);
        const cohortData = await cohortRes.json();
        const subjectsData = await subjectsRes.json();
        if (!cancelled) {
          if (cohortData?.success) {
            const rawCohort = cohortData.cohort;
            const normalizedCohort = normalizeCohort(rawCohort);
            setCohort(normalizedCohort);
            
            if (process.env.NODE_ENV !== 'production') {
              // eslint-disable-next-line no-console
              console.log('[DEV] CohortDetailsClient: Cohort data retrieved', {
                rawCohort: {
                  id: rawCohort?.id,
                  code: rawCohort?.code,
                  org_id: rawCohort?.org_id,
                  level: rawCohort?.level,
                  program_node_id: rawCohort?.program_node_id,
                  program_node_title: rawCohort?.program_node_title,
                  program_node_code: rawCohort?.program_node_code,
                  section_id: rawCohort?.section_id,
                  section_label: rawCohort?.section_label,
                  term_id: rawCohort?.term_id,
                  term_label: rawCohort?.term_label,
                  session_id: rawCohort?.session_id,
                  session_code: rawCohort?.session_code,
                  status: rawCohort?.status,
                  locked_fields: rawCohort?.locked_fields,
                  created_by: rawCohort?.created_by,
                  created_by_email: rawCohort?.created_by_email,
                },
                nullFields: rawCohort ? Object.keys(rawCohort).filter(key => rawCohort[key] === null || rawCohort[key] === undefined) : [],
                normalizedCohort: {
                  program_node: normalizedCohort?.program_node,
                  section: normalizedCohort?.section,
                  term: normalizedCohort?.term,
                  session: normalizedCohort?.session,
                },
              });
            }
          } else if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.error('[DEV] CohortDetailsClient: failed to load cohort', cohortData);
          }
          
          if (subjectsData?.success) {
            const offerings = subjectsData.offerings || [];
            setSubjects(offerings);
            if (process.env.NODE_ENV !== 'production') {
              // eslint-disable-next-line no-console
              console.log('[DEV] CohortDetailsClient: Subject offerings retrieved', {
                count: offerings.length,
                allFields: offerings.length > 0 ? Object.keys(offerings[0]) : [],
                categories: [...new Set(offerings.map(o => o.category || o.subject_category || 'core'))],
                sample: offerings.slice(0, 3).map(o => ({
                  id: o.id,
                  cohort_id: o.cohort_id,
                  subject_id: o.subject_id,
                  elective_group_id: o.elective_group_id,
                  category: o.category,
                  subject_category: o.subject_category,
                  subject_code: o.subject_code,
                  subject_title: o.subject_title,
                  elective_group_code: o.elective_group_code,
                  elective_group_title: o.elective_group_title,
                  is_compulsory: o.is_compulsory,
                  status: o.status,
                  nullFields: Object.keys(o).filter(key => o[key] === null || o[key] === undefined),
                })),
              });
            }
          } else if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.error('[DEV] CohortDetailsClient: failed to load subjects', subjectsData);
          }
          
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.log('[DEV] CohortDetailsClient: Load summary', { 
              cohortOk: cohortData?.success, 
              offeringsOk: subjectsData?.success,
              cohortId,
              effectiveOrgId,
            });
          }
        }
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.error('[DEV] Class Details load failed', e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [effectiveOrgId, cohortId]);

  const statusBadge = (status) => {
    if (status === 'published') return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    if (status === 'archived') return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
  };

  return (
    <div className="w-full">
      <div className="mb-25px">
        <Link href="/dashboards/superadmin-classes-subjects/classes" className="inline-flex items-center gap-2 text-primaryColor dark:text-primaryColor hover:underline">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Classes
        </Link>
      </div>

      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-accordion dark:shadow-accordion-dark p-25px">
        {!effectiveOrgId ? (
          <div className="p-20px border border-dashed border-borderColor dark:border-borderColor-dark rounded text-center text-contentColor dark:text-contentColor-dark">
            Organization is not selected. Please select an organization first from Classes list.
          </div>
        ) : loading ? (
          <div className="animate-pulse">
            <div className="h-7 w-56 bg-gray-200 dark:bg-gray-800 rounded mb-10px" />
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-20px" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-15px">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-100 dark:bg-gray-900 rounded" />
              ))}
            </div>
          </div>
        ) : cohort ? (
          <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-15px mb-20px">
              <div>
                <h1 className="text-size-26 font-bold text-blackColor dark:text-blackColor-dark">
                  {cohort.program_node?.title || 'Class'} <span className="text-contentColor/60 dark:text-contentColor-dark/60">({cohort.section?.label || '-'})</span>
                </h1>
                <div className="flex items-center gap-10px mt-6px">
                  <span className="font-mono text-sm px-10px py-4px rounded bg-primaryColor/10 dark:bg-primaryColor/20 text-primaryColor dark:text-primaryColor-dark">
                    {cohort.code}
                  </span>
                  <span className={`text-xs px-10px py-4px rounded ${statusBadge(cohort.status)}`}>
                    {cohort.status?.charAt(0).toUpperCase() + cohort.status?.slice(1) || 'Draft'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-10px">
                <div className="text-xs text-contentColor dark:text-contentColor-dark">
                  Level: <span className="font-medium capitalize">{cohort.level?.replace('_', ' ')}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-15px mb-25px">
              <div className="p-15px rounded border border-borderColor dark:border-borderColor-dark bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
                <div className="flex items-center gap-10px text-contentColor dark:text-contentColor-dark">
                  <svg className="w-5 h-5 text-primaryColor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
                  </svg>
                  <span className="text-xs opacity-70">Session</span>
                </div>
                <div className="mt-6px text-blackColor dark:text-blackColor-dark font-semibold">{cohort.session?.code || '-'}</div>
              </div>
              <div className="p-15px rounded border border-borderColor dark:border-borderColor-dark bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
                <div className="flex items-center gap-10px text-contentColor dark:text-contentColor-dark">
                  <svg className="w-5 h-5 text-primaryColor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                  </svg>
                  <span className="text-xs opacity-70">{cohort.level === 'puc' ? 'Year' : 'Semester'}</span>
                </div>
                <div className="mt-6px text-blackColor dark:text-blackColor-dark font-semibold">{cohort.term?.label || '-'}</div>
              </div>
              <div className="p-15px rounded border border-borderColor dark:border-borderColor-dark bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
                <div className="flex items-center gap-10px text-contentColor dark:text-contentColor-dark">
                  <svg className="w-5 h-5 text-primaryColor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span className="text-xs opacity-70">Section</span>
                </div>
                <div className="mt-6px text-blackColor dark:text-blackColor-dark font-semibold">{cohort.section?.label || '-'}</div>
              </div>
              <div className="p-15px rounded border border-borderColor dark:border-borderColor-dark bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
                <div className="flex items-center gap-10px text-contentColor dark:text-contentColor-dark">
                  <svg className="w-5 h-5 text-primaryColor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-3 0-5 2-5 5v2h10v-2c0-3-2-5-5-5z" />
                  </svg>
                  <span className="text-xs opacity-70">Total Subjects</span>
                </div>
                <div className="mt-6px text-blackColor dark:text-blackColor-dark font-semibold">{cohort.total_subjects || subjects.length || 0}</div>
              </div>
            </div>

            <div>
              <h2 className="text-size-18 font-bold text-blackColor dark:text-blackColor-dark mb-12px">Subjects</h2>
              {subjects.length > 0 ? (() => {
                // Category labels matching the wizard
                const categoryLabels = {
                  core: 'Core Subjects',
                  elective: 'Elective Subjects',
                  lab: 'Lab Subjects',
                  mandatory: 'Mandatory Subjects',
                  project: 'Project Subjects',
                  internship: 'Internship Subjects',
                  aecc: 'AECC Subjects',
                  sec: 'SEC Subjects',
                  open_elective: 'Open Elective Subjects',
                  prof_elective: 'Professional Elective Subjects',
                };

                // Group subjects by category
                const groupedByCategory = subjects.reduce((acc, off) => {
                  // Get category from offering.category, subject_category, or default to 'core'
                  const category = off.category || off.subject_category || 'core';
                  if (!acc[category]) {
                    acc[category] = [];
                  }
                  acc[category].push(off);
                  return acc;
                }, {});

                // Order categories as they appear in the wizard
                const categoryOrder = ['core', 'elective', 'lab', 'mandatory', 'project', 'internship', 'aecc', 'sec', 'open_elective', 'prof_elective'];
                const sortedCategories = categoryOrder.filter(cat => groupedByCategory[cat]?.length > 0);

                return (
                  <div className="space-y-25px">
                    {sortedCategories.map((category) => (
                      <div key={category}>
                        <h3 className="text-size-16 font-semibold text-blackColor dark:text-blackColor-dark mb-12px">
                          {categoryLabels[category] || category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-15px">
                          {groupedByCategory[category].map((off) => {
                            // Get subject details from the API response structure
                            const subjectTitle = off.subject_title || off.elective_group_title || '-';
                            const subjectCode = off.subject_code || off.elective_group_code || '';
                            const offeringCategory = off.category || off.subject_category || 'core';

                            return (
                              <div key={off.id} className="p-15px rounded border border-borderColor dark:border-borderColor-dark bg-whiteColor dark:bg-whiteColor-dark hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between gap-10px">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-4px">
                                      {subjectTitle}
                                    </div>
                                    <div className="text-xs text-contentColor dark:text-contentColor-dark">
                                      {subjectCode && <span className="font-mono">{subjectCode}</span>}
                                      {off.is_compulsory && subjectCode && ' • '}
                                      {off.is_compulsory && <span>Compulsory</span>}
                                    </div>
                                  </div>
                                  <span className="text-[10px] px-8px py-2px rounded bg-primaryColor/10 dark:bg-primaryColor/20 text-primaryColor dark:text-primaryColor whitespace-nowrap flex-shrink-0">
                                    {offeringCategory}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })() : (
                <div className="p-20px border border-dashed border-borderColor dark:border-borderColor-dark rounded text-center text-contentColor dark:text-contentColor-dark">
                  No subjects assigned yet.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-contentColor dark:text-contentColor-dark">Class not found.</div>
        )}
      </div>
    </div>
  );
}


