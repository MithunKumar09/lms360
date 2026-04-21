import AdminAddQuizMain from "@/components/layout/main/dashboards/AdminAddQuizMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";

export const metadata = {
  title: "Add Quiz | Edurock - Education LMS Template",
  description: "Add Quiz | Edurock - Education LMS Template",
};

const Admin_Add_Quiz = () => {
  return (
    <PageWrapper>
      <main>
        <DsahboardWrapper>
          <DashboardContainer>
            <AdminAddQuizMain />
          </DashboardContainer>
        </DsahboardWrapper>
        <ThemeController />
      </main>
    </PageWrapper>
  );
};

export default Admin_Add_Quiz;

