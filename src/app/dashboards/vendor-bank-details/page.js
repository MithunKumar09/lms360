import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import VendorGuard from "@/components/shared/guards/VendorGuard";
import VendorBankDetailsMain from "@/components/layout/main/dashboards/VendorBankDetailsMain";

export const metadata = {
  title: "Bank Details | Vendor Dashboard | Edurock",
  description: "Add or update your bank account details for payouts",
};

const VendorBankDetailsPage = () => {
  return (
    <VendorGuard>
      <AuthGuard allowedRoles="vendor" requireMfa={false}>
        <PageWrapper>
          <main>
            <DsahboardWrapper>
              <DashboardContainer>
                <VendorBankDetailsMain />
              </DashboardContainer>
            </DsahboardWrapper>
            <ThemeController />
          </main>
        </PageWrapper>
      </AuthGuard>
    </VendorGuard>
  );
};

export default VendorBankDetailsPage;

