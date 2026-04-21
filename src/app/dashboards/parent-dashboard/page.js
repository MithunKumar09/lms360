import ParentDashboardMain from "@/components/layout/main/dashboards/ParentDashboardMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Parent Dashboard | Edurock - Education LMS Template",
  description: "Parent Dashboard | Edurock - Education LMS Template",
};

const Parent_Dashboard = () => {
  return (
    <AuthGuard allowedRoles="parent">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <ParentDashboardMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default Parent_Dashboard;


