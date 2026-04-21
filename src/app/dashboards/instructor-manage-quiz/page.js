import InstructorManageQuizMain from "@/components/layout/main/dashboards/InstructorManageQuizMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";

export const metadata = {
  title: "Manage Quiz | Edurock - Education LMS Template",
  description: "Manage Quiz | Edurock - Education LMS Template",
};

const Instructor_Manage_Quiz = () => {
  return (
    <PageWrapper>
      <main>
        <DsahboardWrapper>
          <DashboardContainer>
            <InstructorManageQuizMain />
          </DashboardContainer>
        </DsahboardWrapper>
        <ThemeController />
      </main>
    </PageWrapper>
  );
};

export default Instructor_Manage_Quiz;

