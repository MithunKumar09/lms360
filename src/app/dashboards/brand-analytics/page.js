import { Suspense } from "react";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import BrandAnalyticsMain from "@/components/layout/main/dashboards/BrandAnalyticsMain";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";

export const metadata = {
  title: "Analytics | Brand Dashboard | Edurock",
  description: "View analytics and insights for your brand events and certificates.",
};

const BrandAnalyticsPage = () => {
  return (
    <AuthGuard allowedRoles="brand">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <Suspense fallback={<SkeletonLoader count={4} />}>
                <BrandAnalyticsMain />
              </Suspense>
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default BrandAnalyticsPage;
