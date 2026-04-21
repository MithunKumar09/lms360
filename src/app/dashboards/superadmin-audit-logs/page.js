import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import SuperadminGuard from "@/components/shared/guards/SuperadminGuard";
import AuditLogsMain from "@/components/layout/main/audit-logs/AuditLogsMain";

export const metadata = {
  title: "Audit Logs | Superadmin Dashboard | Edurock",
  description: "View and manage system audit logs for all users and organizations",
};

const AuditLogsPageMain = () => {
  return (
    <div className="w-full">
      <div className="bg-white dark:bg-whiteColor-dark rounded-5 shadow-accordion dark:shadow-accordion-dark mb-30px overflow-hidden">
        <div className="p-20px md:p-30px lg:p-40px">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1">
              <h1 className="text-24px md:text-28px lg:text-32px font-bold text-blackColor dark:text-blackColor-dark mb-10px leading-tight">
                Audit Logs
              </h1>
              <p className="text-14px md:text-15px text-contentColor dark:text-contentColor-dark leading-relaxed">
                View login and logout events across all organizations and users
              </p>
            </div>
          </div>
        </div>
      </div>

      <AuditLogsMain actorRole="superadmin" />
    </div>
  );
};

const AuditLogsPage = () => {
  return (
    <SuperadminGuard>
      <AuthGuard allowedRoles="superadmin" requireMfa={true}>
        <PageWrapper>
          <main>
            <DsahboardWrapper>
              <DashboardContainer>
                <AuditLogsPageMain />
              </DashboardContainer>
            </DsahboardWrapper>
            <ThemeController />
          </main>
        </PageWrapper>
      </AuthGuard>
    </SuperadminGuard>
  );
};

export default AuditLogsPage;

