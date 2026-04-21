import InstructorAssignCourseMain from "@/components/layout/main/dashboards/InstructorAssignCourseMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import ErrorBoundary from "@/components/shared/errors/ErrorBoundary";

export const metadata = {
  title: "Assign Course | Instructor Dashboard | Edurock - Education LMS Template",
  description: "Assign existing courses to additional cohorts, classes, or subjects",
};

const InstructorAssignCourse = () => {
  return (
    <AuthGuard allowedRoles="instructor" requireMfa={true}>
      <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
        <PageWrapper>
          <main>
            <DsahboardWrapper>
              <DashboardContainer>
                <InstructorAssignCourseMain />
              </DashboardContainer>
            </DsahboardWrapper>
            <ThemeController />
          </main>
        </PageWrapper>
      </ErrorBoundary>
    </AuthGuard>
  );
};

export default InstructorAssignCourse;

