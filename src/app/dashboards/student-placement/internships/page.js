import InternshipApplicationsMain from "@/components/layout/main/placement/InternshipApplicationsMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Internship Applications | Edurock - Education LMS Template",
  description: "Internship Applications | Edurock - Education LMS Template",
};

const InternshipApplicationsPage = () => {
  return (
    <AuthGuard allowedRoles="student">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <InternshipApplicationsMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default InternshipApplicationsPage;
