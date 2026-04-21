import MentorRegisteredEventsMain from "@/components/layout/main/dashboards/MentorRegisteredEventsMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Registered Events | Mentor Dashboard | Edurock - Education LMS Template",
  description: "View registered events with registration counts and capacity utilization",
};

const MentorRegisteredEvents = () => {
  return (
    <AuthGuard allowedRoles="mentor">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <MentorRegisteredEventsMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default MentorRegisteredEvents;
