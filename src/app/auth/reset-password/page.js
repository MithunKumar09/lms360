import HeroPrimary from "@/components/sections/hero-banners/HeroPrimary";
import ResetPasswordSection from "@/components/sections/auth/ResetPasswordSection";
import ThemeController from "@/components/shared/others/ThemeController";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";

export const metadata = {
  title: "Reset Password | EduRock",
  description: "Set a new password for your EduRock account",
};

// Note: intentionally NOT wrapped in LoginGuard — a user may still be logged in
// (e.g. clicking their own reset link in the same browser) and must be able to
// complete the reset. Tenant/session context is unaffected.
const ResetPasswordPage = () => {
  return (
    <PageWrapper>
      <main>
        <HeroPrimary path={"Reset Password"} title={"Reset Password"} />
        <ResetPasswordSection />
        <ThemeController />
      </main>
    </PageWrapper>
  );
};

export default ResetPasswordPage;
