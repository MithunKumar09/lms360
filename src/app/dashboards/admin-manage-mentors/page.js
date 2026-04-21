import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import ManageMentorsMain from "@/components/layout/main/dashboards/ManageMentorsMain";

export const metadata = {
  title: "Manage Mentors | Admin Dashboard | Edurock",
  description: "View and manage mentor-student assignments",
};

const ManageMentors = () => {
  return (
    <AuthGuard allowedRoles={['admin']} requireMfa={false}>
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <ManageMentorsMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default ManageMentors;

