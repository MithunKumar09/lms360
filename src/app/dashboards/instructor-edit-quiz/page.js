import InstructorEditQuizMain from "@/components/layout/main/dashboards/InstructorEditQuizMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";

export const metadata = {
  title: "Edit Quiz | Edurock - Education LMS Template",
  description: "Edit Quiz | Edurock - Education LMS Template",
};

const Instructor_Edit_Quiz = () => {
  return (
    <PageWrapper>
      <main>
        <DsahboardWrapper>
          <DashboardContainer>
            <InstructorEditQuizMain />
          </DashboardContainer>
        </DsahboardWrapper>
        <ThemeController />
      </main>
    </PageWrapper>
  );
};

export default Instructor_Edit_Quiz;

