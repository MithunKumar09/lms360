import InstructorAddAssignmentMain from "@/components/layout/main/dashboards/InstructorAddAssignmentMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";

export const metadata = {
  title: "Add Assignment | Edurock - Education LMS Template",
  description: "Add Assignment | Edurock - Education LMS Template",
};

const Instructor_Add_Assignment = () => {
  return (
    <PageWrapper>
      <main>
        <DsahboardWrapper>
          <DashboardContainer>
            <InstructorAddAssignmentMain />
          </DashboardContainer>
        </DsahboardWrapper>
        <ThemeController />
      </main>
    </PageWrapper>
  );
};

export default Instructor_Add_Assignment;

