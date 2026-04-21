import MentorRegistrationAnalyticsMain from "@/components/layout/main/dashboards/MentorRegistrationAnalyticsMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Registration Analytics | Mentor Dashboard | Edurock - Education LMS Template",
  description: "View registration trends, patterns, and statistics",
};

const MentorRegistrationAnalytics = () => {
  return (
    <AuthGuard allowedRoles="mentor">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <MentorRegistrationAnalyticsMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default MentorRegistrationAnalytics;
