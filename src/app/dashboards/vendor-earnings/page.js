import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import VendorGuard from "@/components/shared/guards/VendorGuard";
import VendorEarningsMain from "@/components/layout/main/dashboards/VendorEarningsMain";

export const metadata = {
  title: "Earnings | Vendor Dashboard | Edurock",
  description: "View your earnings, balances, and payout history",
};

const VendorEarningsPage = () => {
  return (
    <VendorGuard>
      <AuthGuard allowedRoles="vendor" requireMfa={false}>
        <PageWrapper>
          <main>
            <DsahboardWrapper>
              <DashboardContainer>
                <VendorEarningsMain />
              </DashboardContainer>
            </DsahboardWrapper>
            <ThemeController />
          </main>
        </PageWrapper>
      </AuthGuard>
    </VendorGuard>
  );
};

export default VendorEarningsPage;

