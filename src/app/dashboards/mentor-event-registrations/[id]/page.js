import MentorEventRegistrationsMain from "@/components/layout/main/dashboards/MentorEventRegistrationsMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Event Registrations | Mentor Dashboard | Edurock - Education LMS Template",
  description: "View detailed registrations for an event",
};

const MentorEventRegistrations = () => {
  return (
    <AuthGuard allowedRoles="mentor">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <MentorEventRegistrationsMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default MentorEventRegistrations;
