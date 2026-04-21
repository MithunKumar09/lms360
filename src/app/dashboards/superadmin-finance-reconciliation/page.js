import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import SuperadminGuard from "@/components/shared/guards/SuperadminGuard";
import FinanceReconciliationMain from "@/components/layout/main/dashboards/FinanceReconciliationMain";

export const metadata = {
  title: "Reconciliation | Finance | Superadmin Dashboard | Edurock",
  description: "View settlement reconciliation mismatches and exceptions",
};

const FinanceReconciliationPage = () => {
  return (
    <SuperadminGuard>
      <AuthGuard allowedRoles="superadmin" requireMfa={true}>
        <PageWrapper>
          <main>
            <DsahboardWrapper>
              <DashboardContainer>
                <FinanceReconciliationMain />
              </DashboardContainer>
            </DsahboardWrapper>
            <ThemeController />
          </main>
        </PageWrapper>
      </AuthGuard>
    </SuperadminGuard>
  );
};

export default FinanceReconciliationPage;

