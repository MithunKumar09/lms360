"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import CounterDashboard from "@/components/shared/dashboards/CounterDashboard";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import counter1 from "@/assets/images/counter/counter__1.png";
import counter2 from "@/assets/images/counter/counter__2.png";
import counter3 from "@/assets/images/counter/counter__3.png";
import counter4 from "@/assets/images/counter/counter__4.png";
import { format } from "date-fns";
import Link from "next/link";
import Image from "next/image";

const MentorDashboardMain = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Fetch dashboard statistics
  const { data: statsData, isLoading, error, refetch } = useQuery({
    queryKey: ['mentor-dashboard-stats'],
    queryFn: async () => {
      const response = await apiClient.get('/mentors/dashboard-stats');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch dashboard statistics');
      }
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // #region agent edit
  const stats = statsData || {
    events: { total: 0, published: 0, draft: 0, cancelled: 0, totalRegistrations: 0 },
    workshops: { total: 0, published: 0, draft: 0, cancelled: 0, totalRegistrations: 0 },
    jobs: { total: 0, published: 0, draft: 0, closed: 0, totalApplications: 0 },
    classroom: { totalGroups: 0, totalStudents: 0 },
    upcoming: { events: [], workshops: [] },
    recentActivity: [],
  };

  const events = (stats?.events && typeof stats.events === 'object') ? stats.events : { total: 0, published: 0, draft: 0, cancelled: 0, totalRegistrations: 0 };
  const workshops = (stats?.workshops && typeof stats.workshops === 'object') ? stats.workshops : { total: 0, published: 0, draft: 0, cancelled: 0, totalRegistrations: 0 };
  const jobs = (stats?.jobs && typeof stats.jobs === 'object') ? stats.jobs : { total: 0, published: 0, draft: 0, closed: 0, totalApplications: 0 };
  const classroom = (stats?.classroom && typeof stats.classroom === 'object') ? stats.classroom : { totalGroups: 0, totalStudents: 0 };
  const upcoming = (stats?.upcoming && typeof stats.upcoming === 'object') ? stats.upcoming : { events: [], workshops: [] };
  const recentActivity = Array.isArray(stats?.recentActivity) ? stats.recentActivity : [];
  // #endregion

  // Prepare statistics cards
  const counts = [
    {
      name: "Total Events",
      image: counter1,
      data: typeof events.total === 'number' ? events.total : 0,
      symbol: "",
    },
    {
      name: "Total Workshops",
      image: counter2,
      data: typeof workshops.total === 'number' ? workshops.total : 0,
      symbol: "",
    },
    {
      name: "Total Jobs",
      image: counter3,
      data: typeof jobs.total === 'number' ? jobs.total : 0,
      symbol: "",
    },
    {
      name: "Event Registrations",
      image: counter4,
      data: typeof events.totalRegistrations === 'number' ? events.totalRegistrations : 0,
      symbol: "",
    },
    {
      name: "Workshop Registrations",
      image: counter1,
      data: typeof workshops.totalRegistrations === 'number' ? workshops.totalRegistrations : 0,
      symbol: "",
    },
    {
      name: "Job Applications",
      image: counter2,
      data: typeof jobs.totalApplications === 'number' ? jobs.totalApplications : 0,
      symbol: "",
    },
    {
      name: "Classroom Groups",
      image: counter3,
      data: typeof classroom.totalGroups === 'number' ? classroom.totalGroups : 0,
      symbol: "",
    },
    {
      name: "Total Students",
      image: counter4,
      data: typeof classroom.totalStudents === 'number' ? classroom.totalStudents : 0,
      symbol: "",
    },
  ];

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">Error loading dashboard: {error.message}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-primaryColor text-whiteColor rounded-md hover:bg-primaryColor/90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Statistics Cards */}
      <CounterDashboard counts={counts}>
        <HeadingDashboard>Dashboard Summary</HeadingDashboard>
      </CounterDashboard>

      {/* Upcoming Events and Workshops */}
      {/* Upcoming Events and Workshops */}
      {((Array.isArray(upcoming.events) && upcoming.events.length > 0) || (Array.isArray(upcoming.workshops) && upcoming.workshops.length > 0)) && (
        <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
          <HeadingDashboard>Upcoming Events & Workshops</HeadingDashboard>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {/* Upcoming Events */}
            {Array.isArray(upcoming.events) && upcoming.events.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-blackColor dark:text-whiteColor mb-3">
                  Events (Next 7 Days)
                </h3>
                <div className="space-y-3">
                  {upcoming.events
                    .filter(event => event && typeof event === 'object' && event.id)
                    .map((event) => (
                    <Link
                      key={event.id}
                      href={`/dashboards/mentor-event-registrations/${event.id}`}
                      className="block p-4 bg-lightGrey5 dark:bg-whiteColor-dark rounded-lg hover:shadow-md transition-shadow border border-borderColor dark:border-borderColor-dark"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-blackColor dark:text-whiteColor mb-1">
                            {event.title || 'Untitled Event'}
                          </h4>
                          {event.start_date && !isNaN(new Date(event.start_date).getTime()) && (
                          <p className="text-sm text-contentColor dark:text-contentColor-dark">
                            {format(new Date(event.start_date), 'PPP p')}
                          </p>
                          )}
                          {/* #endregion */}
                          {event.location && (
                            <p className="text-xs text-contentColor dark:text-contentColor-dark mt-1">
                              📍 {event.location}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm font-semibold text-primaryColor">
                            {/* #region agent edit */}
                            {typeof event.current_registrations === 'number' ? event.current_registrations : 0}
                            {typeof event.capacity === 'number' && ` / ${event.capacity}`}
                            {/* #endregion */}
                          </p>
                          <p className="text-xs text-contentColor dark:text-contentColor-dark">
                            Registrations
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Workshops */}
            {Array.isArray(upcoming.workshops) && upcoming.workshops.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-blackColor dark:text-whiteColor mb-3">
                  Workshops (Next 7 Days)
                </h3>
                <div className="space-y-3">
                  {upcoming.workshops
                    .filter(workshop => workshop && typeof workshop === 'object' && workshop.id)
                    .map((workshop) => (
                    <Link
                      key={workshop.id}
                      href={`/dashboards/mentor-workshop-registrations/${workshop.id}`}
                      className="block p-4 bg-lightGrey5 dark:bg-whiteColor-dark rounded-lg hover:shadow-md transition-shadow border border-borderColor dark:border-borderColor-dark"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-blackColor dark:text-whiteColor mb-1">
                            {workshop.title || 'Untitled Workshop'}
                          </h4>
                          {workshop.start_date && !isNaN(new Date(workshop.start_date).getTime()) && (
                          <p className="text-sm text-contentColor dark:text-contentColor-dark">
                            {format(new Date(workshop.start_date), 'PPP p')}
                          </p>
                          )}
                          {/* #endregion */}
                          {workshop.location && (
                            <p className="text-xs text-contentColor dark:text-contentColor-dark mt-1">
                              📍 {workshop.location}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm font-semibold text-primaryColor">
                            {/* #region agent edit */}
                            {typeof workshop.current_registrations === 'number' ? workshop.current_registrations : 0}
                            {typeof workshop.capacity === 'number' && ` / ${workshop.capacity}`}
                            {/* #endregion */}
                          </p>
                          <p className="text-xs text-contentColor dark:text-contentColor-dark">
                            Registrations
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {/* #region agent edit */}
      {Array.isArray(recentActivity) && recentActivity.length > 0 && (
        <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
          <HeadingDashboard>Recent Activity</HeadingDashboard>
          
          <div className="mt-4 space-y-3">
            {/* #region agent edit */}
            {recentActivity
              .filter(activity => activity && typeof activity === 'object')
              .map((activity, idx) => (
              <div
                key={idx}
                className="p-4 bg-lightGrey5 dark:bg-whiteColor-dark rounded-lg border border-borderColor dark:border-borderColor-dark"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primaryColor/20 flex items-center justify-center">
                    {activity.activity_type === 'registration' ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primaryColor"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <polyline points="17 11 19 13 23 9"></polyline>
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primaryColor"
                      >
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-contentColor dark:text-contentColor-dark">
                      <span className="font-semibold text-blackColor dark:text-whiteColor">
                        {/* #region agent edit */}
                        {activity.user && typeof activity.user === 'object' 
                          ? `${activity.user.first_name || ''} ${activity.user.last_name || ''}`.trim() || 'Unknown User'
                          : activity.applicant && typeof activity.applicant === 'object'
                          ? `${activity.applicant.first_name || ''} ${activity.applicant.last_name || ''}`.trim() || 'Unknown Applicant'
                          : 'Unknown'}
                        {/* #endregion */}
                      </span>
                      {" "}
                      {activity.activity_type === 'registration' ? 'registered for' : 'applied to'}
                      {" "}
                      <span className="font-semibold text-blackColor dark:text-whiteColor">
                        {/* #region agent edit */}
                        {activity.title || (activity.job && typeof activity.job === 'object' ? activity.job.title : 'Unknown')}
                        {/* #endregion */}
                      </span>
                    </p>
                    {/* #region agent edit */}
                    {(activity.registered_at || activity.applied_at) && !isNaN(new Date(activity.registered_at || activity.applied_at).getTime()) && (
                      <p className="text-xs text-contentColor dark:text-contentColor-dark mt-1">
                        {format(
                          new Date(activity.registered_at || activity.applied_at),
                          'PPP p'
                        )}
                      </p>
                    )}
                    {/* #endregion */}
                    {/* #endregion */}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {/* #region agent edit */}
      {(!Array.isArray(recentActivity) || recentActivity.length === 0) && 
       (!Array.isArray(upcoming.events) || upcoming.events.length === 0) && 
       (!Array.isArray(upcoming.workshops) || upcoming.workshops.length === 0) && (
        <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 text-center">
          <p className="text-contentColor dark:text-contentColor-dark">
            No recent activity. Create your first event, workshop, or job posting to get started!
          </p>
        </div>
      )}
    </>
  );
};

export default MentorDashboardMain;
