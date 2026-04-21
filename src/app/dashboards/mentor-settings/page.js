import MentorSettingsMain from "@/components/layout/main/dashboards/MentorSettingsMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";

export const metadata = {
  title: "Mentor Settings | Edurock - Education LMS Template",
  description: "Mentor Settings | Edurock - Education LMS Template",
};

const Mentor_Settings = () => {
  return (
    <AuthGuard allowedRoles="mentor">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <MentorSettingsMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default Mentor_Settings;

