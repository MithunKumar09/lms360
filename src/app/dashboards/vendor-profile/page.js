import VendorProfileMain from "@/components/layout/main/dashboards/VendorProfileMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";

export const metadata = {
  title: "Vendor Profile | Edurock - Education LMS Template",
  description: "Vendor Profile | Edurock - Education LMS Template",
};

const Vendor_Profile = () => {
  return (
    <AuthGuard allowedRoles="vendor">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <VendorProfileMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default Vendor_Profile;

