//app/dashboards/unified-courses/page.js
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import UnifiedCoursesPlaceholderMain from "@/components/layout/main/dashboards/UnifiedCoursesPlaceholderMain";

export const metadata = {
  title: "Unified Courses | Dashboard",
  description: "Unified enterprise courses page for all dashboard roles.",
};

export default function UnifiedCoursesPage() {
  return (
      <PageWrapper>
      <main>
        <UnifiedCoursesPlaceholderMain />;
      </main>
    </PageWrapper>
  );
}