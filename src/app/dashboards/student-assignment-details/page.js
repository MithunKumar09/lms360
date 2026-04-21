import StudentAssignmentDetailsMain from "@/components/layout/main/dashboards/StudentAssignmentDetailsMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";

export const metadata = {
  title: "Assignment Details | Edurock - Education LMS Template",
  description: "Assignment Details | Edurock - Education LMS Template",
};

const Student_Assignment_Details = () => {
  return (
    <PageWrapper>
      <main>
        <DsahboardWrapper>
          <DashboardContainer>
            <StudentAssignmentDetailsMain />
          </DashboardContainer>
        </DsahboardWrapper>
        <ThemeController />
      </main>
    </PageWrapper>
  );
};

export default Student_Assignment_Details;

