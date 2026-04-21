import CourseManagementMain from "@/components/layout/main/dashboards/CourseManagementMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Course Management | Edurock - Education LMS Template",
  description: "Manage your courses | Edurock - Education LMS Template",
};

const InstructorCourseManagement = () => {
  return (
    <PageWrapper>
      <main>
        <AuthGuard allowedRoles="instructor">
          <DsahboardWrapper>
            <DashboardContainer>
              <CourseManagementMain role="instructor" />
            </DashboardContainer>
          </DsahboardWrapper>
        </AuthGuard>
        <ThemeController />
      </main>
    </PageWrapper>
  );
};

export default InstructorCourseManagement;

