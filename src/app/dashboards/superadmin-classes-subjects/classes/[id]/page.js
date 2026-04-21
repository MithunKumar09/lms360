import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import SuperadminGuard from "@/components/shared/guards/SuperadminGuard";
import Link from "next/link";
import CohortDetailsClient from "@/components/layout/main/classes/CohortDetailsClient";

export const metadata = {
  title: "Class Details | Classes & Subjects | Superadmin Dashboard | Edurock - Education LMS Template",
  description: "Class Details | Classes & Subjects | Superadmin Dashboard | Edurock - Education LMS Template",
};

const ClassDetails = async ({ params }) => {
  return (
    <SuperadminGuard>
      <AuthGuard allowedRoles="superadmin" requireMfa={true}>
        <PageWrapper>
          <main>
            <DsahboardWrapper>
              <DashboardContainer>
                <CohortDetailsClient cohortId={params.id} />
              </DashboardContainer>
            </DsahboardWrapper>
            <ThemeController />
          </main>
        </PageWrapper>
      </AuthGuard>
    </SuperadminGuard>
  );
};

export default ClassDetails;

