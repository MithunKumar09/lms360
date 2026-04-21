import ParentAchievementsMain from "@/components/layout/main/dashboards/ParentAchievementsMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Achievements & Certificates | Parent Dashboard | Edurock - Education LMS Template",
  description: "View your child's achievements, badges, certificates, rewards, and recognition awards",
};

const Parent_Achievements = () => {
  return (
    <AuthGuard allowedRoles="parent">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <ParentAchievementsMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default Parent_Achievements;
