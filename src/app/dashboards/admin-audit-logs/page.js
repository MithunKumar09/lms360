import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import AuditLogsMain from "@/components/layout/main/audit-logs/AuditLogsMain";

export const metadata = {
  title: "Audit Logs | Admin Dashboard | Edurock",
  description: "View audit logs for your organization users",
};

const AuditLogsPageMain = () => {
  return (
    <div className="w-100" style={{ padding: '0' }}>
      <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <div className="card-body" style={{ padding: '28px 32px' }}>
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <h1 className="mb-3" style={{ fontSize: '28px', fontWeight: '700', color: '#212529', lineHeight: '1.2', marginBottom: '12px' }}>Audit Logs</h1>
              <p className="mb-0" style={{ fontSize: '15px', color: '#6c757d', lineHeight: '1.5', marginBottom: '0' }}>
                View login and logout events for users in your organization
              </p>
            </div>
          </div>
        </div>
      </div>

      <AuditLogsMain actorRole="admin" />
    </div>
  );
};

const AuditLogsPage = () => {
  return (
    <AuthGuard allowedRoles={['admin']} requireMfa={false}>
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
  );
};

export default AuditLogsPage;

