import CompanyVirtualInternshipManageMain from "@/components/layout/main/company/CompanyVirtualInternshipManageMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Manage Program | Virtual Internships | Company Dashboard | Edurock",
  description: "Manage a virtual internship program, tasks, and submissions.",
};

const CompanyVirtualInternshipManagePage = ({ params }) => {
  return (
    <AuthGuard allowedRoles="company">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <CompanyVirtualInternshipManageMain programId={params.id} />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default CompanyVirtualInternshipManagePage;

