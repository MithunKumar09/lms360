import AdminPlacementPostingsMain from "@/components/layout/main/admin/AdminPlacementPostingsMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Admin Placement Postings | Edurock - Education LMS Template",
  description: "Admin Placement Postings | Edurock - Education LMS Template",
};

const AdminPlacementPostingsPage = () => {
  return (
    <AuthGuard allowedRoles="admin">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <AdminPlacementPostingsMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default AdminPlacementPostingsPage;
