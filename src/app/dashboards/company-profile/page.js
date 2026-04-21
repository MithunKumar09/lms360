import CompanyProfileMain from "@/components/layout/main/company/CompanyProfileMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Company Profile | Edurock - Education LMS Template",
  description: "Company Profile | Edurock - Education LMS Template",
};

const Company_Profile = () => {
  return (
    <AuthGuard allowedRoles="company">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <CompanyProfileMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default Company_Profile;
