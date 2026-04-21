import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import StudentMentorizedGroupMain from "@/components/layout/main/dashboards/StudentMentorizedGroupMain";

export const metadata = {
  title: "Mentorized Group | Student Dashboard | Edurock",
  description: "Your mentor activity center - Connect with mentors and peers",
};

const StudentMentorizedGroup = () => {
  return (
    <AuthGuard allowedRoles="student">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <StudentMentorizedGroupMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default StudentMentorizedGroup;

