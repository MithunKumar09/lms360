import BrandDashboardMain from "@/components/layout/main/dashboards/BrandDashboardMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Brand Dashboard | Edurock - Education LMS Template",
  description: "Brand Dashboard | Edurock - Education LMS Template",
};

const Brand_Dashboard = () => {
  return (
    <AuthGuard allowedRoles="brand">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <BrandDashboardMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default Brand_Dashboard;
