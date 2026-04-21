import ParentProfileMain from "@/components/layout/main/dashboards/ParentProfileMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Parent Profile | Edurock - Education LMS Template",
  description: "Parent Profile | Edurock - Education LMS Template",
};

const Parent_Profile = () => {
  return (
    <AuthGuard allowedRoles="parent">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <ParentProfileMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default Parent_Profile;
