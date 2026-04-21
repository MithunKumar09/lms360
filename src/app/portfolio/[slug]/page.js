import PortfolioPublicView from "@/components/shared/placement/PortfolioPublicView";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";

export const metadata = {
  title: "Portfolio | Edurock - Education LMS Template",
  description: "View portfolio | Edurock - Education LMS Template",
};

const PublicPortfolioPage = ({ params }) => {
  return (
    <PageWrapper>
      <main>
        <PortfolioPublicView slug={params.slug} />
      </main>
    </PageWrapper>
  );
};

export default PublicPortfolioPage;
