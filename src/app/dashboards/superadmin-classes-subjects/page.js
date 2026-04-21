import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import SuperadminGuard from "@/components/shared/guards/SuperadminGuard";
import Link from "next/link";

export const metadata = {
  title: "Classes & Subjects | Superadmin Dashboard | Edurock - Education LMS Template",
  description: "Classes & Subjects | Superadmin Dashboard | Edurock - Education LMS Template",
};

const ClassesSubjectsMain = () => {
  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-textColor dark:text-textColor-dark">
          Classes & Subjects
        </h1>
        <p className="text-sm text-textColor/70 dark:text-textColor-dark/70 mt-1">
          Manage classes, subjects, and offerings for organizations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link
          href="/dashboards/superadmin-classes-subjects/classes"
          className="p-6 rounded-lg bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-primary/10 dark:bg-primary-dark/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="feather feather-users text-primary dark:text-primary-dark"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-textColor dark:text-textColor-dark mb-1">
            Classes
          </h3>
          <p className="text-sm text-textColor/70 dark:text-textColor-dark/70">
            Manage cohorts and class configurations
          </p>
        </Link>

        <Link
          href="/dashboards/superadmin-classes-subjects/subjects"
          className="p-6 rounded-lg bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-primary/10 dark:bg-primary-dark/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="feather feather-book text-primary dark:text-primary-dark"
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-textColor dark:text-textColor-dark mb-1">
            Subjects
          </h3>
          <p className="text-sm text-textColor/70 dark:text-textColor-dark/70">
            Manage subject catalog and curriculum
          </p>
        </Link>

        <Link
          href="/dashboards/superadmin-classes-subjects/offerings"
          className="p-6 rounded-lg bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-primary/10 dark:bg-primary-dark/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="feather feather-grid text-primary dark:text-primary-dark"
              >
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-textColor dark:text-textColor-dark mb-1">
            Offerings
          </h3>
          <p className="text-sm text-textColor/70 dark:text-textColor-dark/70">
            Build and manage subject offerings
          </p>
        </Link>

        <Link
          href="/dashboards/superadmin-classes-subjects/masters"
          className="p-6 rounded-lg bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-primary/10 dark:bg-primary-dark/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="feather feather-settings text-primary dark:text-primary-dark"
              >
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0A1.65 1.65 0 0 0 9 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0A1.65 1.65 0 0 0 20.91 9H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-textColor dark:text-textColor-dark mb-1">
            Masters
          </h3>
          <p className="text-sm text-textColor/70 dark:text-textColor-dark/70">
            Manage sessions, terms, sections, and program nodes
          </p>
        </Link>

        <Link
          href="/dashboards/superadmin-classes-subjects/bulk"
          className="p-6 rounded-lg bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-primary/10 dark:bg-primary-dark/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="feather feather-upload text-primary dark:text-primary-dark"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-textColor dark:text-textColor-dark mb-1">
            Bulk Import
          </h3>
          <p className="text-sm text-textColor/70 dark:text-textColor-dark/70">
            Import classes and subjects in bulk
          </p>
        </Link>
      </div>
    </div>
  );
};

const ClassesSubjects = () => {
  return (
    <SuperadminGuard>
      <AuthGuard allowedRoles="superadmin" requireMfa={true}>
        <PageWrapper>
          <main>
            <DsahboardWrapper>
              <DashboardContainer>
                <ClassesSubjectsMain />
              </DashboardContainer>
            </DsahboardWrapper>
            <ThemeController />
          </main>
        </PageWrapper>
      </AuthGuard>
    </SuperadminGuard>
  );
};

export default ClassesSubjects;

