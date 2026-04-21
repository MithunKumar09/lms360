import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import SuperadminGuard from "@/components/shared/guards/SuperadminGuard";

export const metadata = {
  title: "Bulk Import | Classes & Subjects | Superadmin Dashboard | Edurock - Education LMS Template",
  description: "Bulk Import | Classes & Subjects | Superadmin Dashboard | Edurock - Education LMS Template",
};

const BulkImportMain = () => {
  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-textColor dark:text-textColor-dark">
          Bulk Import
        </h1>
        <p className="text-sm text-textColor/70 dark:text-textColor-dark/70 mt-1">
          Import classes and subjects in bulk from CSV or Excel files
        </p>
      </div>

      <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-lg p-6">
        <p className="text-textColor/70 dark:text-textColor-dark/70">
          Bulk import interface will be displayed here. This page will be implemented in PROMPT 5/8.
        </p>
      </div>
    </div>
  );
};

const BulkImport = () => {
  return (
    <SuperadminGuard>
      <AuthGuard allowedRoles="superadmin" requireMfa={true}>
        <PageWrapper>
          <main>
            <DsahboardWrapper>
              <DashboardContainer>
                <BulkImportMain />
              </DashboardContainer>
            </DsahboardWrapper>
            <ThemeController />
          </main>
        </PageWrapper>
      </AuthGuard>
    </SuperadminGuard>
  );
};

export default BulkImport;

