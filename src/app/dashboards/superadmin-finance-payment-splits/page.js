import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import SuperadminGuard from "@/components/shared/guards/SuperadminGuard";
import FinancePaymentSplitsMain from "@/components/layout/main/dashboards/FinancePaymentSplitsMain";

export const metadata = {
  title: "Payment Splits | Finance | Superadmin Dashboard | Edurock",
  description: "View payment distribution between platform, vendors, and taxes",
};

const FinancePaymentSplitsPage = () => {
  return (
    <SuperadminGuard>
      <AuthGuard allowedRoles="superadmin" requireMfa={true}>
        <PageWrapper>
          <main>
            <DsahboardWrapper>
              <DashboardContainer>
                <FinancePaymentSplitsMain />
              </DashboardContainer>
            </DsahboardWrapper>
            <ThemeController />
          </main>
        </PageWrapper>
      </AuthGuard>
    </SuperadminGuard>
  );
};

export default FinancePaymentSplitsPage;

