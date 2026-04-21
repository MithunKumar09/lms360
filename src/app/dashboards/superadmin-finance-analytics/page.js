import FinanceAnalyticsMain from "@/components/layout/main/dashboards/FinanceAnalyticsMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Payment Analytics | Finance | Superadmin Dashboard | Edurock",
  description: "Comprehensive payment analytics, revenue trends, payment methods, and refund analytics",
};

const FinanceAnalyticsPage = () => {
  return (
    <AuthGuard allowedRoles={['superadmin']}>
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <FinanceAnalyticsMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default FinanceAnalyticsPage;
