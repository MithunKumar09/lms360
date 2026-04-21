import SuperadminManageQuizMain from "@/components/layout/main/dashboards/SuperadminManageQuizMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";

export const metadata = {
  title: "Manage Quiz | Edurock - Education LMS Template",
  description: "Manage Quiz | Edurock - Education LMS Template",
};

const Superadmin_Manage_Quiz = () => {
  return (
    <PageWrapper>
      <main>
        <DsahboardWrapper>
          <DashboardContainer>
            <SuperadminManageQuizMain />
          </DashboardContainer>
        </DsahboardWrapper>
        <ThemeController />
      </main>
    </PageWrapper>
  );
};

export default Superadmin_Manage_Quiz;

