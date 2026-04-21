import AdminManageQuizMain from "@/components/layout/main/dashboards/AdminManageQuizMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";

export const metadata = {
  title: "Manage Quiz | Edurock - Education LMS Template",
  description: "Manage Quiz | Edurock - Education LMS Template",
};

const Admin_Manage_Quiz = () => {
  return (
    <PageWrapper>
      <main>
        <DsahboardWrapper>
          <DashboardContainer>
            <AdminManageQuizMain />
          </DashboardContainer>
        </DsahboardWrapper>
        <ThemeController />
      </main>
    </PageWrapper>
  );
};

export default Admin_Manage_Quiz;

