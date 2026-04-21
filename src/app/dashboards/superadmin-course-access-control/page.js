import CourseAccessControlMain from "@/components/layout/main/dashboards/CourseAccessControlMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import SuperadminGuard from "@/components/shared/guards/SuperadminGuard";
import ErrorBoundary from "@/components/shared/errors/ErrorBoundary";

export const metadata = {
  title: "Course Access Control | Edurock - Education LMS Template",
  description: "Control admin permissions for course settings",
};

const SuperadminCourseAccessControl = () => {
  return (
    <SuperadminGuard>
      <AuthGuard allowedRoles="superadmin" requireMfa={true}>
        <PageWrapper>
          <ErrorBoundary showDetails={true}>
            <main>
              <DsahboardWrapper>
                <DashboardContainer>
                  <CourseAccessControlMain />
                </DashboardContainer>
              </DsahboardWrapper>
              <ThemeController />
            </main>
          </ErrorBoundary>
        </PageWrapper>
      </AuthGuard>
    </SuperadminGuard>
  );
};

export default SuperadminCourseAccessControl;

