import AdminAssignCourseMain from "@/components/layout/main/dashboards/AdminAssignCourseMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import ErrorBoundary from "@/components/shared/errors/ErrorBoundary";

export const metadata = {
  title: "Assign Course | Admin Dashboard | Edurock - Education LMS Template",
  description: "Assign existing courses to additional cohorts, classes, or subjects",
};

const AdminAssignCourse = () => {
  return (
    <AuthGuard allowedRoles="admin" requireMfa={true}>
      <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
        <PageWrapper>
          <main>
            <DsahboardWrapper>
              <DashboardContainer>
                <AdminAssignCourseMain />
              </DashboardContainer>
            </DsahboardWrapper>
            <ThemeController />
          </main>
        </PageWrapper>
      </ErrorBoundary>
    </AuthGuard>
  );
};

export default AdminAssignCourse;

