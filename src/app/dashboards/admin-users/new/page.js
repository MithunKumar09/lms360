import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import CreateInviteUserForm from "@/components/layout/main/users/CreateInviteUserForm";

export const metadata = {
  title: "Create / Invite User | Admin | Edurock",
  description: "Create or invite users in your organization",
};

const Page = () => {
  return (
    <AuthGuard allowedRoles={['admin']}>
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <div className="w-full">
                <h1 className="text-2xl font-bold text-textColor dark:text-textColor-dark mb-4">Create / Invite User</h1>
                <div className="rounded-lg bg-whiteColor dark:bg-whiteColor-dark p-6 shadow-accordion dark:shadow-accordion-dark">
                  <CreateInviteUserForm actorRole="admin" />
                </div>
              </div>
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default Page;


