import { Suspense } from "react";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import HeadingDashboard from "@/components/shared/headings/HeadingDashboard";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";
import NoData from "@/components/shared/others/NoData";

export const metadata = {
  title: "Brand Events | Edurock",
  description: "Browse and register for brand events.",
};

function BrandEventsContent() {
  // This page will show available brand events
  // For now, it's a placeholder that can be enhanced later
  return (
    <div className="w-full">
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <HeadingDashboard>Brand Events</HeadingDashboard>
        <NoData message="Brand events will be displayed here. This feature is coming soon." />
      </div>
    </div>
  );
}

const BrandEventsPage = () => {
  return (
    <PageWrapper>
      <main>
        <DsahboardWrapper>
          <DashboardContainer>
            <Suspense fallback={<SkeletonLoader count={4} />}>
              <BrandEventsContent />
            </Suspense>
          </DashboardContainer>
        </DsahboardWrapper>
        <ThemeController />
      </main>
    </PageWrapper>
  );
};

export default BrandEventsPage;
