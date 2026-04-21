import SuperadminBrandsMain from "@/components/layout/main/dashboards/SuperadminBrandsMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Brand Management | Superadmin Dashboard | Edurock",
  description: "Manage brand profiles and approvals.",
};

const SuperadminBrandsPage = () => {
  return (
    <AuthGuard allowedRoles="superadmin">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <SuperadminBrandsMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default SuperadminBrandsPage;
