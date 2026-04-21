import OrganizationsBulkImportMain from "@/components/layout/main/organizations/OrganizationsBulkImportMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Bulk Import Organizations | Superadmin Dashboard | Edurock - Education LMS Template",
  description: "Bulk Import Organizations | Superadmin Dashboard | Edurock - Education LMS Template",
};

const BulkImportOrganizations = () => {
  return (
    <AuthGuard allowedRoles="superadmin" requireMfa={true}>
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <OrganizationsBulkImportMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default BulkImportOrganizations;

