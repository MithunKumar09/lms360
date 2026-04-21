import VendorEnrolledStudentsMain from "@/components/layout/main/dashboards/VendorEnrolledStudentsMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Enrolled Students | Vendor Dashboard | Edurock - Education LMS Template",
  description: "View all students enrolled in your courses | Vendor Dashboard | Edurock - Education LMS Template",
};

const VendorEnrolledStudents = () => {
  return (
    <AuthGuard allowedRoles="vendor">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <VendorEnrolledStudentsMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default VendorEnrolledStudents;
