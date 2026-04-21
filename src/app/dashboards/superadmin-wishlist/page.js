import SuperadminWishlistMain from "@/components/layout/main/dashboards/SuperadminWishlistMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";

export const metadata = {
  title: "Superadmin Wishlist | Edurock - Education LMS Template",
  description: "Superadmin Wishlist | Edurock - Education LMS Template",
};

const Superadmin_Wishlist = () => {
  return (
    <PageWrapper>
      <main>
        <DsahboardWrapper>
          <DashboardContainer>
            <SuperadminWishlistMain />
          </DashboardContainer>
        </DsahboardWrapper>
        <ThemeController />
      </main>
    </PageWrapper>
  );
};

export default Superadmin_Wishlist;



