import BrandProfileMain from "@/components/layout/main/dashboards/BrandProfileMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";

export const metadata = {
  title: "Brand Profile | Edurock - Education LMS Template",
  description: "Brand Profile | Edurock - Education LMS Template",
};

const Brand_Profile = () => {
  return (
    <AuthGuard allowedRoles="brand">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <BrandProfileMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default Brand_Profile;
