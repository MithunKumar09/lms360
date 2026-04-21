import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import SuperadminGuard from "@/components/shared/guards/SuperadminGuard";
import CreateInviteUserForm from "@/components/layout/main/users/CreateInviteUserForm";

export const metadata = {
  title: "Create / Invite User | Superadmin | Edurock",
  description: "Create or invite users",
};

const Page = () => {
  return (
    <SuperadminGuard>
      <AuthGuard allowedRoles="superadmin" requireMfa={true}>
        <PageWrapper>
          <main>
            <DsahboardWrapper>
              <DashboardContainer>
                <div className="w-full">
                  <h1 className="text-2xl font-bold text-textColor dark:text-textColor-dark mb-4">Create / Invite User</h1>
                  <div className="rounded-lg bg-whiteColor dark:bg-whiteColor-dark p-6 shadow-accordion dark:shadow-accordion-dark">
                    <CreateInviteUserForm actorRole="superadmin" />
                  </div>
                </div>
              </DashboardContainer>
            </DsahboardWrapper>
            <ThemeController />
          </main>
        </PageWrapper>
      </AuthGuard>
    </SuperadminGuard>
  );
};

export default Page;


