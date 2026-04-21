import VendorWorkshopRegistrationsMain from "@/components/layout/main/dashboards/VendorWorkshopRegistrationsMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Workshop Registrations | Vendor Dashboard | Edurock - Education LMS Template",
  description: "View workshop registrations and statistics | Vendor Dashboard | Edurock - Education LMS Template",
};

const VendorWorkshopRegistrations = () => {
  return (
    <AuthGuard allowedRoles="vendor">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <VendorWorkshopRegistrationsMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default VendorWorkshopRegistrations;
