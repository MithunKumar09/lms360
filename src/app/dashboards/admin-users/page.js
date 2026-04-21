import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import Link from "next/link";
import UsersListMain from "@/components/layout/main/users/UsersListMain";
import "./users-page.css";

export const metadata = {
  title: "Users | Admin Dashboard | Edurock",
  description: "Manage organization users, invites and bulk import",
};

const UsersMain = () => {
  return (
    <div className="w-100 users-page-container">
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <h1 className="h3 mb-2 fw-bold text-dark">Users</h1>
              <p className="text-muted mb-0 small">
                Create, invite and manage users in your organization
              </p>
            </div>
          </div>
        </div>
      </div>

      <UsersListMain actorRole="admin" />
    </div>
  );
};

const Users = () => {
  return (
    <AuthGuard allowedRoles={['admin']} requireMfa={false}>
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <UsersMain />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default Users;


