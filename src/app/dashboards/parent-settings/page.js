import ParentSettingsMain from "@/components/layout/main/dashboards/ParentSettingsMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Parent Settings | Edurock - Education LMS Template",
  description: "Parent Settings | Edurock - Education LMS Template",
};

const Parent_Settings = () => {
  return (
    <AuthGuard allowedRoles="parent">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <ParentSettingsMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default Parent_Settings;
