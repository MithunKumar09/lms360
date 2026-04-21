import BrandSettingsMain from "@/components/layout/main/dashboards/BrandSettingsMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";

export const metadata = {
  title: "Brand Settings | Edurock - Education LMS Template",
  description: "Brand Settings | Edurock - Education LMS Template",
};

const Brand_Settings = () => {
  return (
    <AuthGuard allowedRoles="brand">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <BrandSettingsMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default Brand_Settings;
