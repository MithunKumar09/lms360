import CompanySettingsMain from "@/components/layout/main/company/CompanySettingsMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Company Settings | Edurock - Education LMS Template",
  description: "Company Settings | Edurock - Education LMS Template",
};

const Company_Settings = () => {
  return (
    <AuthGuard allowedRoles="company">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <CompanySettingsMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default Company_Settings;
