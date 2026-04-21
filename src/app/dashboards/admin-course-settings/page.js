import CourseSettingsMain from "@/components/layout/main/dashboards/CourseSettingsMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Course Settings | Edurock - Education LMS Template",
  description: "Manage course settings for your organization",
};

const AdminCourseSettings = () => {
  return (
    <AuthGuard allowedRoles={["admin", "superadmin"]}>
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <CourseSettingsMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default AdminCourseSettings;

