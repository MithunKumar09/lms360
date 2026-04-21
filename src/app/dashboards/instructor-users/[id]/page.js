import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import UserDetailsMain from "@/components/layout/main/users/UserDetailsMain";

export const metadata = {
  title: "User Details | Instructor | Edurock",
  description: "View student details within your scope",
};

const Page = ({ params }) => {
  const { id } = params || {};
  return (
    <AuthGuard allowedRoles={['instructor']}>
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <UserDetailsMain userId={id} actorRole="instructor" />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default Page;


