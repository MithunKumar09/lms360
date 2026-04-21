import VendorAddWorkshopMain from "@/components/layout/main/dashboards/VendorAddWorkshopMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Add Workshop | Vendor Dashboard | Edurock",
  description: "Create a new workshop for your organization.",
};

const VendorAddWorkshopPage = () => {
  return (
    <AuthGuard allowedRoles="vendor">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <VendorAddWorkshopMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default VendorAddWorkshopPage;

