import MentorAddWorkshopMain from "@/components/layout/main/dashboards/MentorAddWorkshopMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Add Workshop | Mentor Dashboard | Edurock",
  description: "Create a new workshop.",
};

const MentorAddWorkshopPage = () => {
  return (
    <AuthGuard allowedRoles="mentor">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <MentorAddWorkshopMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default MentorAddWorkshopPage;

