import Link from "next/link";
import MastersInline from "./MastersInline";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import SuperadminGuard from "@/components/shared/guards/SuperadminGuard";

export const metadata = {
  title: "Masters | Superadmin Dashboard | Edurock",
  description: "Manage master data like sessions, terms, sections, and program nodes.",
};

export default function MastersIndexPage() {
  return (
    <SuperadminGuard>
      <AuthGuard allowedRoles="superadmin" requireMfa={true}>
        <PageWrapper>
          <main>
            <DsahboardWrapper>
              <DashboardContainer>
                <MastersInline />
              </DashboardContainer>
            </DsahboardWrapper>
            <ThemeController />
          </main>
        </PageWrapper>
      </AuthGuard>
    </SuperadminGuard>
  );
}


