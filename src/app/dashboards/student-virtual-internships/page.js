import VirtualInternshipsMain from "@/components/layout/main/placement/VirtualInternshipsMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Virtual Internships | Edurock - Education LMS Template",
  description: "Browse available virtual internship programs | Edurock - Education LMS Template",
};

const StudentVirtualInternshipsPage = () => {
  return (
    <AuthGuard allowedRoles="student">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <VirtualInternshipsMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default StudentVirtualInternshipsPage;