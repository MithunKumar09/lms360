import SubmissionsReportsMain from "@/components/layout/main/dashboards/SubmissionsReportsMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";

export const metadata = {
  title: "Submissions & Reports | Edurock - Education LMS Template",
  description: "Submissions & Reports | Edurock - Education LMS Template",
};

const Superadmin_Submissions = () => {
  return (
    <PageWrapper>
      <main>
        <DsahboardWrapper>
          <DashboardContainer>
            <SubmissionsReportsMain role="superadmin" />
          </DashboardContainer>
        </DsahboardWrapper>
        <ThemeController />
      </main>
    </PageWrapper>
  );
};

export default Superadmin_Submissions;

