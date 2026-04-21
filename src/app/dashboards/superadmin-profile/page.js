import AdminProfileMain from "@/components/layout/main/dashboards/AdminProfileMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import SuperadminGuard from "@/components/shared/guards/SuperadminGuard";

export const metadata = {
  title: "Superadmin Profile | Edurock - Education LMS Template",
  description: "Superadmin Profile | Edurock - Education LMS Template",
};

const Superadmin_Profile = () => {
  return (
    <SuperadminGuard>
      <AuthGuard allowedRoles="superadmin" requireMfa={true}>
        <PageWrapper>
          <main>
            <DsahboardWrapper>
              <DashboardContainer>
                <AdminProfileMain />
              </DashboardContainer>
            </DsahboardWrapper>
            <ThemeController />
          </main>
        </PageWrapper>
      </AuthGuard>
    </SuperadminGuard>
  );
};

export default Superadmin_Profile;

