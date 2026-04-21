import CompanyVirtualInternshipsMain from "@/components/layout/main/company/CompanyVirtualInternshipsMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Virtual Internships | Company Dashboard | Edurock - Education LMS Template",
  description: "Manage Virtual Internship Programs | Company Dashboard | Edurock - Education LMS Template",
};

const Company_Virtual_Internships = () => {
  return (
    <AuthGuard allowedRoles="company">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <CompanyVirtualInternshipsMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default Company_Virtual_Internships;
