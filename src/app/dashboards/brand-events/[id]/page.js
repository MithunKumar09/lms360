import BrandEventDetailsMain from "@/components/layout/main/dashboards/BrandEventDetailsMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Event Details | Brand Dashboard | Edurock",
  description: "View and manage event details.",
};

const BrandEventDetailsPage = ({ params }) => {
  return (
    <AuthGuard allowedRoles="brand">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <BrandEventDetailsMain eventId={params.id} />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default BrandEventDetailsPage;
