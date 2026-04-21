import VendorCourseEnrollmentsMain from "@/components/layout/main/dashboards/VendorCourseEnrollmentsMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Course Enrollments | Vendor Dashboard | Edurock - Education LMS Template",
  description: "View students enrolled in this course | Vendor Dashboard | Edurock - Education LMS Template",
};

const VendorCourseEnrollments = () => {
  return (
    <AuthGuard allowedRoles="vendor">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <VendorCourseEnrollmentsMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default VendorCourseEnrollments;
