import AdminInstructorRequestsMain from "@/components/layout/main/dashboards/AdminInstructorRequestsMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Instructor Requests | Admin Dashboard | Edurock",
  description: "Review and manage instructor promotion requests",
};

const AdminInstructorRequests = () => {
  return (
    <AuthGuard allowedRoles={['admin']} requireMfa={false}>
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <AdminInstructorRequestsMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default AdminInstructorRequests;

