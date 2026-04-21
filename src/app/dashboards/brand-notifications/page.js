import BrandNotifications from "@/components/sections/sub-section/dashboards/BrandNotifications";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Notifications | Brand Dashboard | Edurock",
  description: "View and manage your brand notifications.",
};

const BrandNotificationsPage = () => {
  return (
    <AuthGuard allowedRoles="brand">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <BrandNotifications />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default BrandNotificationsPage;
