import ParentStudentProgressMain from "@/components/layout/main/dashboards/ParentStudentProgressMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Student Progress | Parent Dashboard | Edurock - Education LMS Template",
  description: "View your child's academic progress, course enrollment, completion percentage, attendance, and milestones",
};

const Parent_Student_Progress = () => {
  return (
    <AuthGuard allowedRoles="parent">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <ParentStudentProgressMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default Parent_Student_Progress;
