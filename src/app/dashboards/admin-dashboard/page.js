import AdminDashboardMain from "@/components/layout/main/dashboards/AdminDashboardMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";
export const metadata = {
  title: "Admin Dashboard | Edurock - Education LMS Template",
  description: "Admin Dashboard | Edurock - Education LMS Template",
};
const Admin_Dashboard = () => {
  return (
    <AuthGuard allowedRoles="admin" requireMfa={true}>
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <AdminDashboardMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default Admin_Dashboard;
