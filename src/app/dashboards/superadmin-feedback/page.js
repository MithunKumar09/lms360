import AnnouncementsListMain from "@/components/layout/main/announcements/AnnouncementsListMain.js";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import SuperadminGuard from "@/components/shared/guards/SuperadminGuard";
import SuperadminFeedbackMain from "@/components/layout/main/dashboards/SuperadminFeedbackMain";

export const metadata = {
  title: "Superadmin Feedback | Edurock - Education LMS Template",
  description: "Superadmin Feedback | Edurock - Education LMS Template",
};

const Superadmin_Feedback = () => {
  return (
    <SuperadminGuard>
      <AuthGuard allowedRoles="superadmin" requireMfa={true}>
        <PageWrapper>
          <main>
            <DsahboardWrapper>
              <DashboardContainer>
                <SuperadminFeedbackMain />
              </DashboardContainer>
            </DsahboardWrapper>
            <ThemeController />
          </main>
        </PageWrapper>
      </AuthGuard>
    </SuperadminGuard>
  );
};

export default Superadmin_Feedback;

