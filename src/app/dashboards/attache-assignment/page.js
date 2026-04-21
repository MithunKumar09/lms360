import AttacheAssignmentMain from "@/components/layout/main/dashboards/AttacheAssignmentMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import ErrorBoundary from "@/components/shared/errors/ErrorBoundary";

export const metadata = {
  title: "Attach Assignment | Edurock - Education LMS Template",
  description: "Attach Assignment | Edurock - Education LMS Template",
};

const Attache_Assignment = () => {
  return (
    <AuthGuard allowedRoles="student">
      <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
        <PageWrapper>
          <main>
            <DsahboardWrapper>
              <DashboardContainer>
                <AttacheAssignmentMain />
              </DashboardContainer>
            </DsahboardWrapper>
            <ThemeController />
          </main>
        </PageWrapper>
      </ErrorBoundary>
    </AuthGuard>
  );
};

export default Attache_Assignment;

