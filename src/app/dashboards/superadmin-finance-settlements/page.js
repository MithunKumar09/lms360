import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import SuperadminGuard from "@/components/shared/guards/SuperadminGuard";
import FinanceSettlementsMain from "@/components/layout/main/dashboards/FinanceSettlementsMain";

export const metadata = {
  title: "Settlements | Finance | Superadmin Dashboard | Edurock",
  description: "View and manage settlement records from Razorpay",
};

const FinanceSettlementsPage = () => {
  return (
    <SuperadminGuard>
      <AuthGuard allowedRoles="superadmin" requireMfa={true}>
        <PageWrapper>
          <main>
            <DsahboardWrapper>
              <DashboardContainer>
                <FinanceSettlementsMain />
              </DashboardContainer>
            </DsahboardWrapper>
            <ThemeController />
          </main>
        </PageWrapper>
      </AuthGuard>
    </SuperadminGuard>
  );
};

export default FinanceSettlementsPage;

