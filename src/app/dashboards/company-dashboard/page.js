import CompanyDashboardMain from "@/components/layout/main/dashboards/CompanyDashboardMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Company Dashboard | Edurock - Education LMS Template",
  description: "Company Dashboard | Edurock - Education LMS Template",
};

const Company_Dashboard = () => {
  return (
    <AuthGuard allowedRoles="company">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <CompanyDashboardMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default Company_Dashboard;
