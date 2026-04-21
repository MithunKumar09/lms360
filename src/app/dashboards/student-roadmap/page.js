import StudentRoadmapMain from "@/components/layout/main/dashboards/StudentRoadmapMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import RoadmapErrorBoundary from "@/components/shared/roadmap/RoadmapErrorBoundary";

export const metadata = {
  title: "Roadmap | Student Dashboard | Edurock - Education LMS Template",
  description: "Track your course progress and milestones with interactive roadmap visualization",
};

const StudentRoadmapPage = () => {
  return (
    <AuthGuard allowedRoles="student">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <RoadmapErrorBoundary>
                <StudentRoadmapMain />
              </RoadmapErrorBoundary>
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default StudentRoadmapPage;
