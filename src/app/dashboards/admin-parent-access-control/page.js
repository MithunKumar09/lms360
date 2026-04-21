import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import AdminParentAccessControlMain from "@/components/layout/main/dashboards/AdminParentAccessControlMain";

export const metadata = {
  title: "Parent Access Control | Admin Dashboard | Edurock",
  description: "Manage parent permissions and link parents to students",
};

const AdminParentAccessControl = () => {
  return (
    <AuthGuard allowedRoles={['admin']} requireMfa={false}>
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <AdminParentAccessControlMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default AdminParentAccessControl;
