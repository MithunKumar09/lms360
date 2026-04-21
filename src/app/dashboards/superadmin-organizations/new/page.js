import OrganizationFormMain from "@/components/layout/main/organizations/OrganizationFormMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Create Organization | Superadmin Dashboard | Edurock - Education LMS Template",
  description: "Create Organization | Superadmin Dashboard | Edurock - Education LMS Template",
};

const CreateOrganization = () => {
  return (
    <AuthGuard allowedRoles="superadmin" requireMfa={true}>
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <OrganizationFormMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default CreateOrganization;

