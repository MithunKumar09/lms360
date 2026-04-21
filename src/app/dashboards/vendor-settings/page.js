import VendorSettingsMain from "@/components/layout/main/dashboards/VendorSettingsMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";

export const metadata = {
  title: "Vendor Settings | Edurock - Education LMS Template",
  description: "Vendor Settings | Edurock - Education LMS Template",
};

const Vendor_Settings = () => {
  return (
    <AuthGuard allowedRoles="vendor">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <VendorSettingsMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default Vendor_Settings;

