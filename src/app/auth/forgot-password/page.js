import ForgotPasswordMain from "@/components/layout/main/ForgotPasswordMain";
import ThemeController from "@/components/shared/others/ThemeController";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import LoginGuard from "@/components/shared/guards/LoginGuard";

export const metadata = {
  title: "Forgot Password | EduRock",
  description: "Reset your EduRock account password",
};

const ForgotPasswordPage = () => {
  return (
    <LoginGuard>
      <PageWrapper>
        <main>
          <ForgotPasswordMain />
          <ThemeController />
        </main>
      </PageWrapper>
    </LoginGuard>
  );
};

export default ForgotPasswordPage;