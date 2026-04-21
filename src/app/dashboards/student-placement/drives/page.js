import RecruitmentDrivesMain from "@/components/layout/main/placement/RecruitmentDrivesMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Recruitment Drives | Edurock - Education LMS Template",
  description: "Recruitment Drives | Edurock - Education LMS Template",
};

const RecruitmentDrivesPage = () => {
  return (
    <AuthGuard allowedRoles="student">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <RecruitmentDrivesMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default RecruitmentDrivesPage;
