import OrganizationFinanceMain from "@/components/layout/main/dashboards/OrganizationFinanceMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Organization Finance | Edurock - Education LMS Template",
  description: "Organization Finance Dashboard | Edurock - Education LMS Template",
};

const OrganizationFinancePage = () => {
  return (
    <AuthGuard allowedRoles={['admin', 'superadmin']}>
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <OrganizationFinanceMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default OrganizationFinancePage;

