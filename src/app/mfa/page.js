import MfaMain from "@/components/layout/main/MfaMain";
import ThemeController from "@/components/shared/others/ThemeController";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";

export const metadata = {
  title: "MFA Setup | Edurock - Education LMS Template",
  description: "Multi-Factor Authentication Setup | Edurock - Education LMS Template",
};

const MfaPage = () => {
  return (
    <PageWrapper>
      <main>
        <MfaMain />
        <ThemeController />
      </main>
    </PageWrapper>
  );
};

export default MfaPage;


