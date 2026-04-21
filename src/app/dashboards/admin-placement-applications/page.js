import AdminPlacementApplicationsMain from "@/components/layout/main/admin/AdminPlacementApplicationsMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Admin Placement Applications | Edurock - Education LMS Template",
  description: "Admin Placement Applications | Edurock - Education LMS Template",
};

const AdminPlacementApplicationsPage = () => {
  return (
    <AuthGuard allowedRoles="admin">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <AdminPlacementApplicationsMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default AdminPlacementApplicationsPage;
