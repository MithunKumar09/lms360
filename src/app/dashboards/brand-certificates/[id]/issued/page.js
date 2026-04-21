import BrandCertificateIssuedMain from "@/components/layout/main/dashboards/BrandCertificateIssuedMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";

export const metadata = {
  title: "Issued Certificates | Brand Dashboard | Edurock",
  description: "View certificates issued for this template.",
};

const BrandCertificateIssuedPage = ({ params }) => {
  return (
    <AuthGuard allowedRoles="brand">
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <BrandCertificateIssuedMain certificateId={params.id} />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default BrandCertificateIssuedPage;
