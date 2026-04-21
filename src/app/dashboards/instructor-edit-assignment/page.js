import InstructorEditAssignmentMain from "@/components/layout/main/dashboards/InstructorEditAssignmentMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";

export const metadata = {
  title: "Edit Assignment | Edurock - Education LMS Template",
  description: "Edit Assignment | Edurock - Education LMS Template",
};

const Instructor_Edit_Assignment = () => {
  return (
    <PageWrapper>
      <main>
        <DsahboardWrapper>
          <DashboardContainer>
            <InstructorEditAssignmentMain />
          </DashboardContainer>
        </DsahboardWrapper>
        <ThemeController />
      </main>
    </PageWrapper>
  );
};

export default Instructor_Edit_Assignment;

