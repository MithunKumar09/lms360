import PostingDetailMain from "@/components/layout/main/placement/PostingDetailMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Job Details | Edurock - Education LMS Template",
  description: "View job details | Edurock - Education LMS Template",
};

const JobDetailPage = ({ params }) => {
  return (
    <AuthGuard allowedRoles="student">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <PostingDetailMain postingId={params.id} postingType="job" />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default JobDetailPage;
