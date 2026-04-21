import VendorFinanceMain from "@/components/layout/main/dashboards/VendorFinanceMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Vendor Finance | Finance | Vendor Dashboard | Edurock",
  description: "Vendor finance dashboard for monitoring payments, settlements, and payouts",
};

const VendorFinancePage = () => {
  return (
    <AuthGuard allowedRoles={['vendor']}>
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <VendorFinanceMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default VendorFinancePage;
